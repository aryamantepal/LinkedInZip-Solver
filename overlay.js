// Visual solution overlay
function showSolution(path) {
    // Remove any existing solution overlay
    document.querySelectorAll('.zip-solver-highlight').forEach(el => el.remove());

    if (!path || path.length === 0) {
        console.log('No solution to display');
        return;
    }

    path.forEach(([r, c], index) => {
        // Try multiple ways to find the cell
        let cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (!cell) {
            // Try finding by position in grid
            const allCells = document.querySelectorAll('[data-testid*="cell"], .cell, button');
            const gridSize = Math.sqrt(allCells.length);
            if (Number.isInteger(gridSize)) {
                const cellIndex = r * gridSize + c;
                cell = allCells[cellIndex];
            }
        }

        if (cell) {
            // Create highlight overlay
            const highlight = document.createElement('div');
            highlight.className = 'zip-solver-highlight';
            highlight.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 255, 0, 0.3);
                border: 2px solid #00ff00;
                pointer-events: none;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #000;
                font-weight: bold;
                font-size: 12px;
            `;
            highlight.textContent = index + 1;

            // Make sure cell is positioned relatively
            if (getComputedStyle(cell).position === 'static') {
                cell.style.position = 'relative';
            }

            cell.appendChild(highlight);
        }
    });
}
