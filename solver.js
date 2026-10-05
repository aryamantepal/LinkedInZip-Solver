// solver.js - Ultra-fast Hamiltonian Path Solver for LinkedIn Zip
// Supports rectangular grids, checkpoints in sequential order, walls, and blocked cells.

/**
 * Compresses a path sequence into turning points (waypoints).
 * LinkedIn Zip allows clicking along straight lines by targeting the end of each run.
 * @param {number[]} sequence - Array of 1D cell indices
 * @returns {number[]} Array of waypoint cell indices
 */
function compressSequence(sequence) {
    const result = [];
    if (!sequence || sequence.length === 0) return result;
    result.push(sequence[0]);
    let i = 1;
    while (i < sequence.length) {
        const runStart = i - 1;
        const diff = sequence[i] - sequence[runStart];
        while (i + 1 < sequence.length && sequence[i + 1] - sequence[i] === diff) {
            i++;
        }
        result.push(sequence[i]);
        i++;
    }
    return result;
}

/**
 * Optimized bitfield backtracking solver with degree isolation pruning.
 * Resolves full Hamiltonian paths on grids in single-digit milliseconds.
 */
class ZipGrid {
    #m;
    #n;
    #size;
    #head;
    #foot;
    #current;
    #path;
    #visitedCells;
    #degreeModifications;
    #cellStatuses;

    /**
     * @param {number} m - Number of rows
     * @param {number} n - Number of columns
     * @param {number[]} numberedCells - 1D indices of numbered checkpoints in order (1, 2, ...)
     * @param {number[]} downWalls - 1D indices of cells with walls below them
     * @param {number[]} rightWalls - 1D indices of cells with walls to their right
     * @param {number[]} blockedCells - 1D indices of blocked/inactive cells
     */
    constructor(m, n, numberedCells, downWalls = [], rightWalls = [], blockedCells = []) {
        this.#m = m;
        this.#n = n;
        this.#size = m * n;

        if (!numberedCells || numberedCells.length === 0) {
            throw new Error("No numbered checkpoints provided");
        }

        this.#head = numberedCells[0];
        this.#foot = numberedCells[numberedCells.length - 1];
        this.#current = 1;

        this.#path = new Array(this.#size).fill(-1);
        this.#path[0] = this.#head;
        this.#visitedCells = 1;
        this.#degreeModifications = Array.from({ length: this.#size }, () => []);

        this.#constructCellStatuses(m, n, this.#size, numberedCells, downWalls, rightWalls, blockedCells);
        this.#setVisited(this.#head, true);

        for (const b of blockedCells) {
            if (!this.#isVisited(b)) {
                this.#setVisited(b, true);
                this.#visitedCells++;
            }
        }
    }

    #constructCellStatuses(m, n, size, numberedCells, downWalls, rightWalls, blockedCells) {
        this.#cellStatuses = new Array(size).fill(4 << 1);

        // Grid outer boundaries decrement degrees
        for (let i = 0; i < n; i++) {
            this.#decrementDegree(i);
            this.#decrementDegree(size - n + i);
        }
        for (let i = 0; i < m; i++) {
            this.#decrementDegree(n * i);
            this.#decrementDegree(n * i + n - 1);
        }

        // Down walls
        for (const w of downWalls) {
            if (w >= 0 && w < size) {
                this.#addDownWall(w);
                this.#decrementDegree(w);
                if (w < size - n) this.#decrementDegree(w + n);
            }
        }

        // Right walls
        for (const w of rightWalls) {
            if (w >= 0 && w < size) {
                this.#addRightWall(w);
                this.#decrementDegree(w);
                if (w % n !== n - 1) this.#decrementDegree(w + 1);
            }
        }

        // Blocked cells (isolated on all 4 borders)
        for (const b of blockedCells) {
            if (b < 0 || b >= size) continue;
            // Up wall (down wall of cell above)
            if (b >= n && !this.#hasDownWall(b - n)) {
                this.#addDownWall(b - n);
                this.#decrementDegree(b - n);
            }
            // Down wall
            if (b < size - n && !this.#hasDownWall(b)) {
                this.#addDownWall(b);
                this.#decrementDegree(b + n);
            }
            // Left wall (right wall of cell to left)
            if (b % n !== 0 && !this.#hasRightWall(b - 1)) {
                this.#addRightWall(b - 1);
                this.#decrementDegree(b - 1);
            }
            // Right wall
            if (b % n !== n - 1 && !this.#hasRightWall(b)) {
                this.#addRightWall(b);
                this.#decrementDegree(b + 1);
            }
        }

        // Assign numbers to checkpoints
        for (let i = 0; i < numberedCells.length; i++) {
            this.#label(numberedCells[i], i + 1);
        }
    }

    solve() {
        const callStack = [];
        let solution = null;
        this.#stackPushValidMoves(callStack, this.#head);

        while (callStack.length !== 0) {
            const [from, to, doVisit] = callStack.pop();
            while (this.lastMove() !== from) {
                this.unvisit();
            }
            doVisit.call(this, to, from);

            if (this.#visitedCells === this.#size) {
                solution = this.#path.filter(p => p !== -1);
                break;
            }
            this.#stackPushValidMoves(callStack, to);
        }

        while (this.#visitedCells > 1) {
            this.unvisit();
        }

        return solution;
    }

    #stackPushValidMoves(stack, from) {
        if (this.canVisitRight()) stack.push([from, from + 1, this.#doVisitRight]);
        if (this.canVisitLeft()) stack.push([from, from - 1, this.#doVisitLeft]);
        if (this.canVisitDown()) stack.push([from, from + this.#n, this.#doVisitDown]);
        if (this.canVisitUp()) stack.push([from, from - this.#n, this.#doVisitUp]);
    }

    canVisitUp() {
        return this.#canVisitDirection(
            s => s - this.#n,
            (d) => d >= 0,
            (ds) => this.maskHasDownWall(ds),
            [this.#visitIsolatesDown, this.#visitIsolatesLeft, this.#visitIsolatesRight]
        );
    }

    canVisitDown() {
        return this.#canVisitDirection(
            s => s + this.#n,
            (d) => d < this.#size,
            (ds, ss) => this.maskHasDownWall(ss),
            [this.#visitIsolatesUp, this.#visitIsolatesLeft, this.#visitIsolatesRight]
        );
    }

    canVisitLeft() {
        return this.#canVisitDirection(
            s => s - 1,
            (d, s) => s % this.#n !== 0,
            (ds) => this.maskHasRightWall(ds),
            [this.#visitIsolatesUp, this.#visitIsolatesDown, this.#visitIsolatesRight]
        );
    }

    canVisitRight() {
        return this.#canVisitDirection(
            s => s + 1,
            (d, s) => s % this.#n !== this.#n - 1,
            (ds, ss) => this.maskHasRightWall(ss),
            [this.#visitIsolatesUp, this.#visitIsolatesDown, this.#visitIsolatesLeft]
        );
    }

    #canVisitDirection(computeDst, checkBounds, checkWall, willIsolateFns) {
        const src = this.lastMove();
        const dst = computeDst(src);
        if (!checkBounds(dst, src)) return false;

        const dstStatus = this.#cellStatuses[dst];
        const srcStatus = this.#cellStatuses[src];

        const validMove = !this.maskIsVisited(dstStatus) &&
            !checkWall(dstStatus, srcStatus) &&
            !(this.getMaskLabel(dstStatus) > this.#current + 1);

        if (!validMove) return false;

        for (const willIsolateFn of willIsolateFns) {
            if (willIsolateFn.call(this, src)) return false;
        }

        return true;
    }

    #visitIsolatesUp(src) { return this.#visitIsolates(this.#visitImpactsUpDegree(src)); }
    #visitIsolatesDown(src) { return this.#visitIsolates(this.#visitImpactsDownDegree(src)); }
    #visitIsolatesLeft(src) { return this.#visitIsolates(this.#visitImpactsLeftDegree(src)); }
    #visitIsolatesRight(src) { return this.#visitIsolates(this.#visitImpactsRightDegree(src)); }

    #visitIsolates(cell) {
        if (cell < 0) return false;
        const degree = this.#getDegree(cell);
        return (cell === this.#foot && degree === 1) || (cell !== this.#foot && degree === 2);
    }

    #doVisitUp(dst, src) {
        this.#visitDirection(dst, src, [this.#visitImpactsDownDegree, this.#visitImpactsLeftDegree, this.#visitImpactsRightDegree]);
    }

    #doVisitDown(dst, src) {
        this.#visitDirection(dst, src, [this.#visitImpactsUpDegree, this.#visitImpactsLeftDegree, this.#visitImpactsRightDegree]);
    }

    #doVisitLeft(dst, src) {
        this.#visitDirection(dst, src, [this.#visitImpactsUpDegree, this.#visitImpactsDownDegree, this.#visitImpactsRightDegree]);
    }

    #doVisitRight(dst, src) {
        this.#visitDirection(dst, src, [this.#visitImpactsUpDegree, this.#visitImpactsDownDegree, this.#visitImpactsLeftDegree]);
    }

    #visitDirection(dst, src, impactFns) {
        this.#setVisited(dst, true);
        const dstContent = this.#getLabel(dst);
        if (dstContent > 0) this.#current = dstContent;

        const newModifications = this.#degreeModifications[this.#visitedCells - 1];
        for (const impactFn of impactFns) {
            const cell = impactFn.call(this, src);
            if (cell >= 0) {
                this.#decrementDegree(cell);
                newModifications.push(cell);
            }
        }
        this.#path[this.#visitedCells++] = dst;
    }

    #visitImpactsUpDegree(src) {
        if (src >= this.#n) {
            const up = src - this.#n;
            const upStatus = this.#cellStatuses[up];
            if (!this.maskIsVisited(upStatus) && !this.maskHasDownWall(upStatus)) return up;
        }
        return -1;
    }

    #visitImpactsDownDegree(src) {
        if (src < this.#size - this.#n) {
            const down = src + this.#n;
            if (!this.#isVisited(down) && !this.#hasDownWall(src)) return down;
        }
        return -1;
    }

    #visitImpactsLeftDegree(src) {
        if (src % this.#n !== 0) {
            const left = src - 1;
            const leftStatus = this.#cellStatuses[left];
            if (!this.maskIsVisited(leftStatus) && !this.maskHasRightWall(leftStatus)) return left;
        }
        return -1;
    }

    #visitImpactsRightDegree(src) {
        if (src % this.#n !== this.#n - 1) {
            const right = src + 1;
            if (!this.#isVisited(right) && !this.#hasRightWall(src)) return right;
        }
        return -1;
    }

    unvisit() {
        const lastMove = this.lastMove();
        this.#path[(this.#visitedCells--) - 1] = -1;

        const modifications = this.#degreeModifications[this.#visitedCells - 1];
        while (modifications.length !== 0) {
            this.#incrementDegree(modifications.pop());
        }

        const lastMoveLabel = this.#getLabel(lastMove);
        if (lastMoveLabel > 0) {
            this.#current = lastMoveLabel - 1;
        }

        this.#setVisited(lastMove, false);
        return true;
    }

    lastMove() {
        for (let i = this.#visitedCells - 1; i >= 0; i--) {
            if (this.#path[i] !== -1) return this.#path[i];
        }
        return -1;
    }

    #isVisited(cell) { return this.maskIsVisited(this.#cellStatuses[cell]); }
    maskIsVisited(mask) { return (mask & 1) === 1; }
    #setVisited(cell, visited) {
        if (visited) this.#cellStatuses[cell] |= 0x1;
        else this.#cellStatuses[cell] &= ~0x1;
    }
    #getDegree(cell) { return (this.#cellStatuses[cell] & 0xE) >>> 1; }
    #decrementDegree(cell) { this.#cellStatuses[cell] -= 0x2; }
    #incrementDegree(cell) { this.#cellStatuses[cell] += 0x2; }
    #hasDownWall(cell) { return (this.#cellStatuses[cell] & 0x10) !== 0; }
    maskHasDownWall(mask) { return (mask & 0x10) !== 0; }
    #addDownWall(cell) { this.#cellStatuses[cell] |= 0x10; }
    #hasRightWall(cell) { return (this.#cellStatuses[cell] & 0x20) !== 0; }
    maskHasRightWall(mask) { return (mask & 0x20) !== 0; }
    #addRightWall(cell) { this.#cellStatuses[cell] |= 0x20; }
    #getLabel(cell) { return this.getMaskLabel(this.#cellStatuses[cell]); }
    getMaskLabel(mask) { return mask >>> 6; }
    #label(cell, number) { this.#cellStatuses[cell] |= (number << 6); }
}

/**
 * Universal solveZip entry point supporting multiple input representations:
 * - solveZip(grid2D, walls)
 * - solveZip(rows, cols, numberedCells, downWalls, rightWalls, blockedCells)
 * - solveZip({ rows, cols, numberedCells, downWalls, rightWalls, blockedCells, grid })
 *
 * @returns {Array<[number, number]> & { indices: number[], compressed: number[], compressedCoords: Array<[number, number]>, solveTimeMs: number }}
 */
function solveZip(arg1, arg2, arg3, arg4, arg5, arg6) {
    const startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    let rows = 0;
    let cols = 0;
    let numberedCells = [];
    let downWalls = [];
    let rightWalls = [];
    let blockedCells = [];

    if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        // Signature: (rows, cols, numberedCells, downWalls, rightWalls, blockedCells)
        rows = arg1;
        cols = arg2;
        numberedCells = arg3 || [];
        downWalls = arg4 || [];
        rightWalls = arg5 || [];
        blockedCells = arg6 || [];
    } else if (Array.isArray(arg1) && Array.isArray(arg1[0])) {
        // Signature: (grid2D, options)
        const grid = arg1;
        rows = grid.length;
        cols = grid[0].length;
        const options = arg2 || {};

        const checkpoints = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const val = grid[r][c];
                const idx = r * cols + c;
                if (val === -1) {
                    blockedCells.push(idx);
                } else if (val > 0) {
                    checkpoints.push({ idx, val });
                }
            }
        }
        checkpoints.sort((a, b) => a.val - b.val);
        numberedCells = checkpoints.map(cp => cp.idx);
        downWalls = options.downWalls || [];
        rightWalls = options.rightWalls || [];
        if (options.blockedCells) {
            blockedCells = [...new Set([...blockedCells, ...options.blockedCells])];
        }
    } else if (typeof arg1 === 'object' && arg1 !== null) {
        // Signature: ({ rows, cols, numberedCells, downWalls, rightWalls, blockedCells, grid })
        if (arg1.grid && Array.isArray(arg1.grid)) {
            return solveZip(arg1.grid, {
                downWalls: arg1.downWalls,
                rightWalls: arg1.rightWalls,
                blockedCells: arg1.blockedCells
            });
        }
        rows = arg1.rows || 0;
        cols = arg1.cols || 0;
        numberedCells = arg1.numberedCells || [];
        downWalls = arg1.downWalls || [];
        rightWalls = arg1.rightWalls || [];
        blockedCells = arg1.blockedCells || [];
    } else {
        console.error('solveZip: Invalid arguments', arg1);
        return [];
    }

    if (rows <= 0 || cols <= 0 || numberedCells.length === 0) {
        console.error('solveZip: Missing dimensions or checkpoints', { rows, cols, numberedCells });
        return [];
    }

    try {
        const zipGrid = new ZipGrid(rows, cols, numberedCells, downWalls, rightWalls, blockedCells);
        const pathIndices = zipGrid.solve();

        if (!pathIndices || pathIndices.length === 0) {
            console.warn('solveZip: No solution found');
            return [];
        }

        const endTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const solveTimeMs = Math.round((endTime - startTime) * 100) / 100;

        // Convert 1D indices to [row, col] coordinates
        const resultCoords = pathIndices.map(idx => [Math.floor(idx / cols), idx % cols]);

        // Attach helpful metadata
        resultCoords.indices = pathIndices;
        resultCoords.compressed = compressSequence(pathIndices);
        resultCoords.compressedCoords = resultCoords.compressed.map(idx => [Math.floor(idx / cols), idx % cols]);
        resultCoords.solveTimeMs = solveTimeMs;
        resultCoords.rows = rows;
        resultCoords.cols = cols;

        return resultCoords;
    } catch (err) {
        console.error('solveZip error:', err);
        return [];
    }
}

// Module / Browser export setup
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        solveZip,
        compressSequence,
        ZipGrid
    };
}

if (typeof window !== 'undefined') {
    window.solveZip = solveZip;
    window.compressSequence = compressSequence;
    window.ZipGrid = ZipGrid;
    window.ZipSolver = {
        solve: solveZip,
        compressSequence,
        ZipGrid
    };
}
