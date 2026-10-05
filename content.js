// content.js - Main coordinator and UI for LinkedIn Zip Solver

(function () {
    'use strict';

    let currentSolution = null;
    let currentScrapedData = null;
    let isAutoPlaying = false;
    let autoPlayAborted = false;

    // =========================================================================
    // 1. Grid Scraping & Hydration Extraction
    // =========================================================================

    /**
     * Attempts to extract pre-hydrated solution data directly from LinkedIn's SSR script.
     */
    function extractHydrationSolution(doc = document) {
        try {
            const script = doc.getElementById('rehydrate-data');
            if (!script || !script.textContent) return null;
            const text = script.textContent;

            const indicator = '\\"solution\\"';
            let anchor = text.indexOf(indicator);
            if (anchor < 0) anchor = text.indexOf('"solution"');

            if (anchor >= 0) {
                const start = text.indexOf('[', anchor);
                const end = text.indexOf(']', start);
                if (start >= 0 && end > start) {
                    const parsed = JSON.parse(text.substring(start, end + 1));
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            }
        } catch (err) {
            console.warn('[ZipSolver] Hydration parse notice:', err.message);
        }
        return null;
    }

    /**
     * Scrapes the game grid, dimension data, checkpoints, walls, and cell elements.
     */
    function scrapeGrid() {
        console.log('[ZipSolver] Detecting grid...');

        // Locate document/frame containing the game
        let doc = document;
        const iframe = document.querySelector('iframe');
        if (iframe) {
            try {
                const fDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (fDoc && (fDoc.querySelector('[data-testid*="grid"]') || fDoc.querySelector('[data-cell-idx]'))) {
                    doc = fDoc;
                }
            } catch (e) {
                // Cross-origin restriction fallback
            }
        }

        // Find grid container
        const gridContainer = doc.querySelector(
            '[data-testid="interactive-grid"], .grid-game-board, .interactive-grid, [data-testid*="grid"], .puzzle-grid'
        );

        // Find cell DOM elements
        let cells = [];
        if (gridContainer) {
            cells = Array.from(gridContainer.querySelectorAll('[data-cell-idx]'));
            if (cells.length === 0) {
                cells = Array.from(gridContainer.querySelectorAll('[data-testid*="cell"], .trail-cell, button, div[role="button"]'));
            }
        } else {
            cells = Array.from(doc.querySelectorAll('[data-cell-idx]'));
            if (cells.length === 0) {
                cells = Array.from(doc.querySelectorAll('.trail-cell, [data-testid*="cell"]'));
            }
        }

        if (cells.length === 0) {
            console.warn('[ZipSolver] No cell elements found');
            return null;
        }

        // Determine grid dimensions
        let rows = 0;
        let cols = 0;

        if (gridContainer && gridContainer.style) {
            const rProp = gridContainer.style.getPropertyValue('--rows');
            const cProp = gridContainer.style.getPropertyValue('--cols');
            if (rProp && cProp) {
                rows = parseInt(rProp, 10);
                cols = parseInt(cProp, 10);
            }
        }

        // Fallback: visual coordinate clustering (getBoundingClientRect)
        if (!rows || !cols || isNaN(rows) || isNaN(cols)) {
            const yPositions = [];
            const xPositions = [];
            const threshold = 12;

            cells.forEach(cell => {
                const rect = cell.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) return;

                if (!yPositions.some(y => Math.abs(y - rect.top) < threshold)) {
                    yPositions.push(rect.top);
                }
                if (!xPositions.some(x => Math.abs(x - rect.left) < threshold)) {
                    xPositions.push(rect.left);
                }
            });

            if (yPositions.length > 0 && xPositions.length > 0) {
                rows = yPositions.length;
                cols = xPositions.length;
            } else {
                const sqrt = Math.sqrt(cells.length);
                if (Number.isInteger(sqrt)) {
                    rows = sqrt;
                    cols = sqrt;
                } else {
                    rows = 6;
                    cols = Math.ceil(cells.length / 6);
                }
            }
        }

        const totalSize = rows * cols;
        const cellDivs = new Array(totalSize).fill(null);
        const numberedCells = [];
        const downWalls = [];
        const rightWalls = [];
        const blockedCells = [];

        cells.forEach((cell, i) => {
            let idx = -1;
            const attrIdx = cell.getAttribute('data-cell-idx');
            if (attrIdx !== null && !isNaN(parseInt(attrIdx, 10))) {
                idx = parseInt(attrIdx, 10);
            } else if (cell.hasAttribute('data-row') && cell.hasAttribute('data-col')) {
                const r = parseInt(cell.getAttribute('data-row'), 10);
                const c = parseInt(cell.getAttribute('data-col'), 10);
                idx = r * cols + c;
            } else if (gridContainer) {
                const gRect = gridContainer.getBoundingClientRect();
                const cRect = cell.getBoundingClientRect();
                if (cRect.width > 0 && cRect.height > 0) {
                    const r = Math.min(rows - 1, Math.max(0, Math.floor(((cRect.top - gRect.top + cRect.height / 2) / gRect.height) * rows)));
                    const c = Math.min(cols - 1, Math.max(0, Math.floor(((cRect.left - gRect.left + cRect.width / 2) / gRect.width) * cols)));
                    idx = r * cols + c;
                }
            } else {
                idx = i;
            }

            if (idx >= 0 && idx < totalSize) {
                cellDivs[idx] = cell;

                // Checkpoint text / number
                const contentEl = cell.querySelector('[data-cell-content="true"], .trail-cell-content') || cell;
                const text = (contentEl.textContent || '').trim();
                const num = parseInt(text, 10);
                if (!isNaN(num) && num > 0) {
                    numberedCells[num - 1] = idx;
                }

                // Walls
                if (cell.querySelector('.trail-cell-wall--down, .wall-down, .wall-bottom') || cell.classList.contains('wall-down')) {
                    downWalls.push(idx);
                }
                if (cell.querySelector('.trail-cell-wall--right, .wall-right') || cell.classList.contains('wall-right')) {
                    rightWalls.push(idx);
                }

                // Blocked
                if (cell.disabled || cell.getAttribute('aria-disabled') === 'true' || cell.classList.contains('blocked') || cell.classList.contains('disabled')) {
                    blockedCells.push(idx);
                }
            }
        });

        const validNumberedCells = [];
        for (let i = 0; i < numberedCells.length; i++) {
            if (numberedCells[i] !== undefined) {
                validNumberedCells.push(numberedCells[i]);
            }
        }

        const hydrationSolution = extractHydrationSolution(doc);

        return {
            rows,
            cols,
            cellDivs,
            gridContainer,
            numberedCells: validNumberedCells,
            downWalls,
            rightWalls,
            blockedCells,
            hydrationSolution
        };
    }

    // =========================================================================
    // 2. Synthetic Event Dispatch & Auto-Play
    // =========================================================================

    /**
     * Dispatches complete pointer/mouse cycle to simulate user click.
     */
    function simulateClick(element) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const opts = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: cx,
            clientY: cy,
            screenX: cx,
            screenY: cy,
            button: 0,
            buttons: 1
        };

        if (window.PointerEvent) {
            element.dispatchEvent(new PointerEvent('pointerdown', opts));
            element.dispatchEvent(new PointerEvent('pointerup', opts));
        }
        element.dispatchEvent(new MouseEvent('mousedown', opts));
        element.dispatchEvent(new MouseEvent('mouseup', opts));
        element.dispatchEvent(new MouseEvent('click', opts));
    }

    /**
     * Automatically traces through solution path.
     */
    async function autoPlay(path, cellDivs, useWaypoints = true, delayMs = 120) {
        if (!path || path.length === 0) return;
        if (isAutoPlaying) return;

        isAutoPlaying = true;
        autoPlayAborted = false;

        const updateBtn = document.getElementById('zip-auto-play-btn');
        if (updateBtn) {
            updateBtn.textContent = '⏹ Stop';
            updateBtn.style.background = '#dc3545';
        }

        const statusEl = document.getElementById('zip-solver-status');
        const sequence = (useWaypoints && path.compressed && path.compressed.length > 0)
            ? path.compressed
            : (path.indices || path.map(([r, c]) => r * (path.cols || 6) + c));

        try {
            for (let i = 0; i < sequence.length; i++) {
                if (autoPlayAborted) break;

                const idx = sequence[i];
                let cell = cellDivs ? cellDivs[idx] : null;

                if (!cell) {
                    const r = Math.floor(idx / (path.cols || 6));
                    const c = idx % (path.cols || 6);
                    cell = document.querySelector(`[data-cell-idx="${idx}"], [data-row="${r}"][data-col="${c}"]`);
                }

                if (cell) {
                    simulateClick(cell);
                    if (statusEl) {
                        statusEl.textContent = `Auto-playing step ${i + 1}/${sequence.length}...`;
                    }
                }

                await new Promise(res => setTimeout(res, delayMs));
            }

            if (statusEl) {
                statusEl.textContent = autoPlayAborted ? 'Auto-play stopped' : '🎉 Puzzle completed!';
            }
        } catch (err) {
            console.error('[ZipSolver] AutoPlay error:', err);
            if (statusEl) statusEl.textContent = 'Error during auto-play';
        } finally {
            isAutoPlaying = false;
            autoPlayAborted = false;
            if (updateBtn) {
                updateBtn.textContent = '▶ Auto Play';
                updateBtn.style.background = '#f59e0b';
            }
        }
    }

    // =========================================================================
    // 3. UI Control Panel
    // =========================================================================

    function createControlPanel() {
        const existing = document.getElementById('zip-solver-panel');
        if (existing) return existing;

        const panel = document.createElement('div');
        panel.id = 'zip-solver-panel';
        panel.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            background: #ffffff;
            border: 1px solid #d0d7de;
            border-radius: 12px;
            padding: 16px;
            z-index: 999999;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 240px;
            color: #1f2328;
            box-sizing: border-box;
            user-select: none;
            transition: all 0.2s ease-in-out;
        `;

        panel.innerHTML = `
            <div id="zip-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: move;">
                <div style="font-weight: 700; font-size: 14px; color: #0a66c2; display: flex; align-items: center; gap: 6px;">
                    <span>⚡ LinkedIn Zip Solver</span>
                </div>
                <button id="zip-minimize-btn" style="background: none; border: none; cursor: pointer; color: #65676b; font-size: 14px; padding: 2px 6px;">_</button>
            </div>
            <div id="zip-panel-body">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button id="zip-solve-btn" style="padding: 9px 12px; background: #0a66c2; color: #ffffff; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        🧩 Solve
                    </button>
                    <div style="display: flex; gap: 8px;">
                        <button id="zip-show-btn" style="flex: 1; padding: 8px; background: #10b981; color: #ffffff; border: none; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">
                            👁 Show Path
                        </button>
                        <button id="zip-auto-play-btn" style="flex: 1; padding: 8px; background: #f59e0b; color: #ffffff; border: none; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">
                            ▶ Auto Play
                        </button>
                    </div>
                    <button id="zip-clear-btn" style="padding: 7px; background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer;">
                        🗑 Clear Overlays
                    </button>
                </div>
                <div id="zip-solver-status" style="margin-top: 10px; font-size: 11px; color: #6b7280; text-align: center; min-height: 16px; line-height: 1.4;">
                    Ready
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Make draggable
        makeDraggable(panel, panel.querySelector('#zip-panel-header'));

        // Event listeners
        const statusEl = panel.querySelector('#zip-solver-status');
        const solveBtn = panel.querySelector('#zip-solve-btn');
        const showBtn = panel.querySelector('#zip-show-btn');
        const autoPlayBtn = panel.querySelector('#zip-auto-play-btn');
        const clearBtn = panel.querySelector('#zip-clear-btn');
        const minimizeBtn = panel.querySelector('#zip-minimize-btn');
        const bodyEl = panel.querySelector('#zip-panel-body');

        let isMinimized = false;
        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            bodyEl.style.display = isMinimized ? 'none' : 'block';
            minimizeBtn.textContent = isMinimized ? '□' : '_';
        });

        // Solve action
        solveBtn.addEventListener('click', () => {
            statusEl.textContent = 'Analyzing board...';
            currentScrapedData = scrapeGrid();

            if (!currentScrapedData) {
                statusEl.textContent = '❌ Could not find puzzle grid';
                return;
            }

            const { rows, cols, numberedCells, downWalls, rightWalls, blockedCells, hydrationSolution } = currentScrapedData;

            // Tier 1: Hydration solution available
            if (hydrationSolution && hydrationSolution.length > 0) {
                const resultCoords = hydrationSolution.map(idx => [Math.floor(idx / cols), idx % cols]);
                resultCoords.indices = hydrationSolution;
                resultCoords.compressed = window.compressSequence ? window.compressSequence(hydrationSolution) : hydrationSolution;
                resultCoords.rows = rows;
                resultCoords.cols = cols;
                resultCoords.solveTimeMs = 0;
                currentSolution = resultCoords;
                statusEl.textContent = `✅ Solved (Instant): ${hydrationSolution.length} steps`;
                return;
            }

            // Tier 2: Solver algorithm
            if (typeof window.solveZip === 'function') {
                const solution = window.solveZip(rows, cols, numberedCells, downWalls, rightWalls, blockedCells);
                if (solution && solution.length > 0) {
                    currentSolution = solution;
                    statusEl.textContent = `✅ Solved in ${solution.solveTimeMs}ms (${solution.length} steps)`;
                } else {
                    statusEl.textContent = '❌ No valid path found';
                }
            } else {
                statusEl.textContent = '❌ Solver module not loaded';
            }
        });

        // Show Solution action
        showBtn.addEventListener('click', () => {
            if (!currentSolution) {
                // Auto solve first if not already solved
                solveBtn.click();
            }
            if (currentSolution && typeof window.showSolution === 'function') {
                window.showSolution(
                    currentSolution,
                    currentScrapedData ? currentScrapedData.cellDivs : null,
                    currentScrapedData ? currentScrapedData.gridContainer : null
                );
                statusEl.textContent = `Displaying ${currentSolution.length} steps`;
            }
        });

        // Auto Play action
        autoPlayBtn.addEventListener('click', () => {
            if (isAutoPlaying) {
                autoPlayAborted = true;
                return;
            }
            if (!currentSolution) {
                solveBtn.click();
            }
            if (currentSolution) {
                autoPlay(currentSolution, currentScrapedData ? currentScrapedData.cellDivs : null, true, 120);
            }
        });

        // Clear action
        clearBtn.addEventListener('click', () => {
            if (typeof window.clearSolution === 'function') {
                window.clearSolution();
            }
            currentSolution = null;
            statusEl.textContent = 'Cleared';
        });

        return panel;
    }

    /**
     * Draggable helper for floating panel.
     */
    function makeDraggable(element, handle) {
        let offsetX = 0, offsetY = 0, startX = 0, startY = 0;

        handle.onmousedown = function (e) {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            document.onmouseup = stopDrag;
            document.onmousemove = drag;
        };

        function drag(e) {
            e.preventDefault();
            offsetX = startX - e.clientX;
            offsetY = startY - e.clientY;
            startX = e.clientX;
            startY = e.clientY;
            element.style.top = (element.offsetTop - offsetY) + 'px';
            element.style.left = (element.offsetLeft - offsetX) + 'px';
            element.style.right = 'auto';
        }

        function stopDrag() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // =========================================================================
    // 4. Communication with Extension Popup
    // =========================================================================

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getStatus') {
                const gridData = scrapeGrid();
                sendResponse({
                    isZipPage: window.location.href.includes('/games'),
                    hasGrid: gridData !== null,
                    hasSolution: currentSolution !== null,
                    stepCount: currentSolution ? currentSolution.length : 0
                });
            } else if (request.action === 'solve') {
                const solveBtn = document.getElementById('zip-solve-btn');
                if (solveBtn) solveBtn.click();
                sendResponse({ success: true, steps: currentSolution ? currentSolution.length : 0 });
            } else if (request.action === 'showSolution') {
                const showBtn = document.getElementById('zip-show-btn');
                if (showBtn) showBtn.click();
                sendResponse({ success: true });
            } else if (request.action === 'autoPlay') {
                const autoPlayBtn = document.getElementById('zip-auto-play-btn');
                if (autoPlayBtn) autoPlayBtn.click();
                sendResponse({ success: true });
            } else if (request.action === 'clear') {
                const clearBtn = document.getElementById('zip-clear-btn');
                if (clearBtn) clearBtn.click();
                sendResponse({ success: true });
            }
            return true;
        });
    }

    // =========================================================================
    // 5. Lifecycle & SPA Navigation Handling
    // =========================================================================

    function init() {
        if (window.location.href.includes('/games')) {
            createControlPanel();
        }
    }

    // Observer for LinkedIn Single Page Application (SPA) navigation
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            init();
        }
    });
    urlObserver.observe(document, { subtree: true, childList: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();