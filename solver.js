// Improved solver with better checkpoint handling
function solveZip(grid) {
    if (!grid) return [];

    const rows = grid.length;
    const cols = grid[0].length;

    // Find all checkpoints and sort by value
    const checkpoints = [];
    let totalValidCells = 0;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== -1) {
                totalValidCells++;
                if (grid[r][c] > 0) {
                    checkpoints.push({ r, c, val: grid[r][c] });
                }
            }
        }
    }

    checkpoints.sort((a, b) => a.val - b.val);
    console.log('Checkpoints:', checkpoints);
    console.log('Total valid cells:', totalValidCells);

    if (checkpoints.length === 0) {
        console.error('No checkpoints found');
        return [];
    }

    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let bestPath = [];

    function dfs(r, c, path, visited, checkpointIndex) {
        // Add current position to path
        path.push([r, c]);
        visited[r][c] = true;

        // Check if we're at the expected checkpoint
        if (checkpointIndex < checkpoints.length) {
            const expectedCheckpoint = checkpoints[checkpointIndex];
            if (r === expectedCheckpoint.r && c === expectedCheckpoint.c) {
                checkpointIndex++;
            } else if (grid[r][c] > 0) {
                // We're at a checkpoint but not the right one
                path.pop();
                visited[r][c] = false;
                return false;
            }
        }

        // Success: visited all cells and all checkpoints
        if (path.length === totalValidCells && checkpointIndex === checkpoints.length) {
            bestPath = [...path];
            return true;
        }

        // Try all directions
        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;

            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                !visited[nr][nc] && grid[nr][nc] !== -1) {

                if (dfs(nr, nc, path, visited, checkpointIndex)) {
                    return true;
                }
            }
        }

        // Backtrack
        path.pop();
        visited[r][c] = false;
        return false;
    }

    // Start from the first checkpoint
    const startPoint = checkpoints[0];
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

    console.log('Starting DFS from:', startPoint);
    dfs(startPoint.r, startPoint.c, [], visited, 0);

    console.log('Solution path:', bestPath);
    return bestPath;
}
