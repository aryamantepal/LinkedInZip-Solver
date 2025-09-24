function scrapeGrid() {
    // Get all grid cells
    const cells = document.querySelectorAll('.cell[data-row][data-col]');

    // Find grid size
    let maxRow = 0, maxCol = 0;
    cells.forEach(cell => {
        const r = parseInt(cell.getAttribute('data-row'), 10);
        const c = parseInt(cell.getAttribute('data-col'), 10);
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
    });

    // Build 2D array
    let grid = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(0));

    cells.forEach(cell => {
        const r = parseInt(cell.getAttribute('data-row'), 10);
        const c = parseInt(cell.getAttribute('data-col'), 10);

        if (cell.classList.contains('blocked')) {
            grid[r][c] = -1;  // mark blocked
        } else if (!isNaN(parseInt(cell.textContent))) {
            grid[r][c] = parseInt(cell.textContent);  // checkpoint
        } else {
            grid[r][c] = 0;  // empty
        }
    });

    return grid;
}
