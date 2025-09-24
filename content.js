// content.js - Main content script that coordinates everything

let isEnabled = false;
let solutionPath = [];

// Wait for the game to load
function waitForGame() {
    return new Promise((resolve) => {
        const checkForGrid = () => {
            const gridCells = document.querySelectorAll('[data-testid*="cell"], .cell[data-row][data-col], [data-row][data-col]');
            if (gridCells.length > 0) {
                resolve();
            } else {
                setTimeout(checkForGrid, 500);
            }
        };
        checkForGrid();
    });
}

// Enhanced grid scraping with multiple selector strategies
function scrapeGrid() {
    console.log('Scraping LinkedIn Zip grid...');

    // Try multiple selector strategies
    let cells = document.querySelectorAll('[data-testid*="cell"]');
    if (cells.length === 0) {
        cells = document.querySelectorAll('.cell[data-row][data-col]');
    }
    if (cells.length === 0) {
        cells = document.querySelectorAll('[data-row][data-col]');
    }
    if (cells.length === 0) {
        // Try to find game grid by structure
        const gameContainer = document.querySelector('[data-testid*="game"], .game-container, .puzzle-grid');
        if (gameContainer) {
            cells = gameContainer.querySelectorAll('button, div[role="button"], .cell');
        }
    }

    if (cells.length === 0) {
        console.error('No grid cells found');
        return null;
    }

    console.log(`Found ${cells.length} cells`);

    // Find grid dimensions
    let maxRow = 0, maxCol = 0;
    const cellData = [];

    cells.forEach((cell, index) => {
        let r, c;

        // Try to get row/col from data attributes
        if (cell.hasAttribute('data-row') && cell.hasAttribute('data-col')) {
            r = parseInt(cell.getAttribute('data-row'), 10);
            c = parseInt(cell.getAttribute('data-col'), 10);
        } else {
            // Fallback: try to infer from position or index
            const gridSize = Math.sqrt(cells.length);
            if (Number.isInteger(gridSize)) {
                r = Math.floor(index / gridSize);
                c = index % gridSize;
            } else {
                // Skip if we can't determine position
                return;
            }
        }

        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
        cellData.push({ cell, r, c });
    });

    // Create 2D grid
    const grid = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(0));

    cellData.forEach(({ cell, r, c }) => {
        // Check if cell is blocked/disabled
        if (cell.disabled ||
            cell.classList.contains('blocked') ||
            cell.classList.contains('disabled') ||
            cell.getAttribute('aria-disabled') === 'true') {
            grid[r][c] = -1;
        }
        // Check for numbers (checkpoints)
        else {
            const text = cell.textContent.trim();
            const num = parseInt(text, 10);
            if (!isNaN(num) && num > 0) {
                grid[r][c] = num;
            } else {
                grid[r][c] = 0; // Empty cell
            }
        }
    });

    console.log('Grid scraped:', grid);
    return grid;
}

// Auto-play the solution
function autoPlay(path) {
    if (!path || path.length === 0) return;

    let currentStep = 0;

    function clickNext() {
        if (currentStep >= path.length) return;

        const [r, c] = path[currentStep];
        let cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);

        if (!cell) {
            // Fallback cell finding
            const allCells = document.querySelectorAll('button, [role="button"]');
            const gridSize = Math.sqrt(allCells.length);
            if (Number.isInteger(gridSize)) {
                const cellIndex = r * gridSize + c;
                cell = allCells[cellIndex];
            }
        }

        if (cell && !cell.disabled) {
            cell.click();
            currentStep++;
            setTimeout(clickNext, 200); // Small delay between clicks
        }
    }

    clickNext();
}

// Create control panel
function createControlPanel() {
    // Remove existing panel
    const existingPanel = document.getElementById('zip-solver-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'zip-solver-panel';
    panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        border: 2px solid #0066cc;
        border-radius: 8px;
        padding: 15px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: Arial, sans-serif;
        min-width: 200px;
    `;

    panel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #0066cc;">LinkedIn Zip Solver</h3>
        <button id="solve-btn" style="padding: 8px 16px; margin: 5px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">Solve</button>
        <button id="show-solution-btn" style="padding: 8px 16px; margin: 5px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Show Solution</button>
        <button id="auto-play-btn" style="padding: 8px 16px; margin: 5px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">Auto Play</button>
        <button id="clear-btn" style="padding: 8px 16px; margin: 5px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear</button>
        <div id="status" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    document.getElementById('solve-btn').onclick = () => {
        const status = document.getElementById('status');
        status.textContent = 'Solving...';

        const grid = scrapeGrid();
        if (grid) {
            solutionPath = solveZip(grid); // This function comes from solver.js
            if (solutionPath.length > 0) {
                status.textContent = `Solution found: ${solutionPath.length} steps`;
            } else {
                status.textContent = 'No solution found';
            }
        } else {
            status.textContent = 'Could not read grid';
        }
    };

    document.getElementById('show-solution-btn').onclick = () => {
        if (solutionPath.length > 0) {
            showSolution(solutionPath); // This function comes from overlay.js
        }
    };

    document.getElementById('auto-play-btn').onclick = () => {
        if (solutionPath.length > 0) {
            autoPlay(solutionPath);
        }
    };

    document.getElementById('clear-btn').onclick = () => {
        document.querySelectorAll('.zip-solver-highlight').forEach(el => el.remove());
        document.getElementById('status').textContent = '';
    };
}

// Initialize when page loads
async function init() {
    try {
        await waitForGame();
        createControlPanel();
        console.log('LinkedIn Zip Solver loaded successfully');
    } catch (error) {
        console.error('Failed to initialize LinkedIn Zip Solver:', error);
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}