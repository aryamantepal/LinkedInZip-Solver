// run a dfs on the graph from content.js
function solveZip(grid) {
    rows = grid.length;
    cols = grid[0].length;

    // Find checkpoints (must be visited in order)
    let checkpoints = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] > 0) {
                checkpoints.push({ r, c, val: grid[r][c] });
            }
        }
    }
    checkpoints.sort((a, b) => a.val - b.val);

    // directions
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    let path = [];
    let visited = Array.from({ length: rows }, () => Array(cols).fill(false));

    function dfs(r, c, visitedCount, checkpointIdx) {
        // mark visited
        visited[r][c] = true;
        path.push([r, c]);

        // checkpoint check
        if (checkpointIdx < checkpoints.length &&
            checkpoints[checkpointIdx].r === r &&
            checkpoints[checkpointIdx].c === c) {
            checkpointIdx++;
        }

        // success condition
        if (visitedCount === totalCells && checkpointIdx === checkpoints.length) {
            return true;
        }

        for (let [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                !visited[nr][nc] && grid[nr][nc] !== -1) {
                if (dfs(nr, nc, visitedCount + 1, checkpointIdx)) {
                    return true;
                }
            }
        }

        // backtrack
        visited[r][c] = false;
        path.pop();
        return false;
    }

    // Start at first checkpoint
    let start = checkpoints[0];
    dfs(start.r, start.c, 1, 1);

    return path;
}

function countBlocked(grid) {
    let count = 0;
    for (let row of grid) {
        for (let cell of row) {
            if (cell === -1) count++;
        }
    }
    return count;
}