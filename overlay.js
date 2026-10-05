// overlay.js - Visual solution path rendering for LinkedIn Zip
// Draws an SVG path connecting cell centers with step numbers and direction indicators.

let resizeHandlerAttached = false;
let currentSolutionState = null;

/**
 * Remove any existing solution overlays and indicators.
 */
function clearSolution() {
    document.querySelectorAll('.zip-solver-highlight, #zip-solver-svg-overlay, .zip-solver-badge').forEach(el => el.remove());
    currentSolutionState = null;
}

/**
 * Locate cell element given (r, c) or index.
 * @param {number} r - Row index
 * @param {number} c - Col index
 * @param {number} cols - Total columns
 * @param {HTMLElement[]} [cachedCells] - Optional array of cached DOM cell elements
 * @returns {HTMLElement|null}
 */
function findCellElement(r, c, cols, cachedCells) {
    const idx = r * cols + c;
    if (cachedCells && cachedCells[idx]) {
        return cachedCells[idx];
    }

    // Selector strategies
    const candidates = [
        `[data-cell-idx="${idx}"]`,
        `[data-row="${r}"][data-col="${c}"]`,
        `[data-testid*="cell-${r}-${c}"]`,
        `[data-testid*="cell-${idx}"]`,
        `#cell-${r}-${c}`,
        `#cell-${idx}`
    ];

    for (const selector of candidates) {
        const found = document.querySelector(selector);
        if (found) return found;
    }

    return null;
}

/**
 * Displays the solution path visually over the puzzle grid.
 * @param {Array<[number, number]>} path - Array of [row, col] coordinates
 * @param {HTMLElement[]} [cellDivs] - Optional pre-scraped array of cell elements
 * @param {HTMLElement} [gridContainer] - Optional parent grid container
 */
function showSolution(path, cellDivs, gridContainer) {
    clearSolution();

    if (!path || path.length === 0) {
        console.warn('showSolution: No path provided');
        return;
    }

    // Determine grid dimensions
    let maxRow = 0;
    let maxCol = 0;
    for (const [r, c] of path) {
        if (r > maxRow) maxRow = r;
        if (c > maxCol) maxCol = c;
    }
    const rows = maxRow + 1;
    const cols = maxCol + 1;

    // Cache state for resize handling
    currentSolutionState = { path, cellDivs, gridContainer };

    // Resolve all cell elements
    const resolvedCells = [];
    path.forEach(([r, c]) => {
        const cell = findCellElement(r, c, cols, cellDivs);
        resolvedCells.push(cell);
    });

    // Locate or fallback to grid container
    if (!gridContainer) {
        const firstValidCell = resolvedCells.find(c => c !== null);
        if (firstValidCell) {
            gridContainer = firstValidCell.closest('[data-testid="interactive-grid"], .grid-game-board, .interactive-grid') || firstValidCell.parentElement;
        }
    }

    if (!gridContainer && resolvedCells.filter(Boolean).length === 0) {
        console.error('showSolution: Could not locate grid elements');
        return;
    }

    // Create SVG overlay for the connecting path
    const containerRect = gridContainer ? gridContainer.getBoundingClientRect() : document.body.getBoundingClientRect();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'zip-solver-svg-overlay';
    svg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999;
        overflow: visible;
    `;

    // Add arrow marker definitions
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <filter id="zip-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        <marker id="zip-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#00c853" />
        </marker>
    `;
    svg.appendChild(defs);

    if (gridContainer) {
        if (getComputedStyle(gridContainer).position === 'static') {
            gridContainer.style.position = 'relative';
        }
        gridContainer.appendChild(svg);
    } else {
        document.body.appendChild(svg);
    }

    // Compute coordinates of cell centers relative to gridContainer
    const points = [];
    resolvedCells.forEach((cell, stepIdx) => {
        if (!cell) return;

        const cellRect = cell.getBoundingClientRect();
        const baseRect = gridContainer ? gridContainer.getBoundingClientRect() : { left: 0, top: 0 };
        const cx = cellRect.left - baseRect.left + cellRect.width / 2;
        const cy = cellRect.top - baseRect.top + cellRect.height / 2;
        points.push({ x: cx, y: cy });

        // Create step number badge
        const badge = document.createElement('div');
        badge.className = 'zip-solver-badge zip-solver-highlight';

        const isStart = stepIdx === 0;
        const isEnd = stepIdx === path.length - 1;
        const bg = isStart ? '#0066cc' : (isEnd ? '#e53935' : '#00c853');

        badge.style.cssText = `
            position: absolute;
            top: 4px;
            left: 4px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${bg};
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            pointer-events: none;
            z-index: 1001;
            font-family: Arial, sans-serif;
            border: 1.5px solid #ffffff;
        `;
        badge.textContent = String(stepIdx + 1);

        if (getComputedStyle(cell).position === 'static') {
            cell.style.position = 'relative';
        }
        cell.appendChild(badge);

        // Highlight cell boundary lightly
        const highlightBox = document.createElement('div');
        highlightBox.className = 'zip-solver-highlight';
        highlightBox.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 200, 83, 0.12);
            border: 1.5px solid rgba(0, 200, 83, 0.4);
            border-radius: 4px;
            pointer-events: none;
            z-index: 1000;
        `;
        cell.appendChild(highlightBox);
    });

    // Draw connecting path line
    if (points.length > 1) {
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        const pointsAttr = points.map(p => `${p.x},${p.y}`).join(' ');
        polyline.setAttribute('points', pointsAttr);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#00c853');
        polyline.setAttribute('stroke-width', '4');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        polyline.setAttribute('filter', 'url(#zip-glow)');
        polyline.setAttribute('opacity', '0.85');
        svg.appendChild(polyline);
    }

    // Attach resize listener once to keep overlay aligned if viewport changes
    if (!resizeHandlerAttached) {
        window.addEventListener('resize', () => {
            if (currentSolutionState) {
                showSolution(currentSolutionState.path, currentSolutionState.cellDivs, currentSolutionState.gridContainer);
            }
        });
        resizeHandlerAttached = true;
    }
}

// Global exports for content script
if (typeof window !== 'undefined') {
    window.showSolution = showSolution;
    window.clearSolution = clearSolution;
}
