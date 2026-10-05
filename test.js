// test.js - Unit tests for LinkedIn Zip Solver

const { solveZip, compressSequence, ZipGrid } = require('./solver.js');
const assert = require('assert');

console.log('--- Running LinkedIn Zip Solver Test Suite ---');

// Test 1: 3x3 basic puzzle
{
    const path = solveZip(3, 3, [0, 8], [], []);
    assert.strictEqual(path.length, 9, '3x3 should visit 9 cells');
    assert.deepStrictEqual(path[0], [0, 0], 'Start at (0, 0)');
    assert.deepStrictEqual(path[8], [2, 2], 'End at (2, 2)');
    console.log('✅ Test 1: 3x3 simple path passed');
}

// Test 2: 4x4 with checkpoints
{
    const path = solveZip(4, 4, [0, 7, 8, 15, 12], [], []);
    assert.strictEqual(path.length, 16, '4x4 should visit 16 cells');
    assert.strictEqual(path.indices.length, 16);
    console.log('✅ Test 2: 4x4 multi-checkpoint passed');
}

// Test 3: 4x4 with right wall preventing direct right move
{
    const path = solveZip(4, 4, [0, 12], [], [0]);
    assert.strictEqual(path.length, 16, '4x4 with wall should visit 16 cells');
    // First move must be down (to index 4) because right wall is at 0
    assert.strictEqual(path.indices[1], 4, 'Should move down from 0 to 4 due to right wall');
    console.log('✅ Test 3: Wall constraint passed');
}

// Test 4: 6x6 grid with multiple checkpoints
{
    const path = solveZip(6, 6, [0, 11, 12, 23, 24, 35, 30], [], []);
    assert.strictEqual(path.length, 36, '6x6 should visit 36 cells');
    assert.ok(path.solveTimeMs < 50, `Solve time should be fast (${path.solveTimeMs}ms)`);
    console.log(`✅ Test 4: 6x6 puzzle solved in ${path.solveTimeMs}ms`);
}

// Test 5: compressSequence
{
    const seq = [0, 1, 2, 3, 4, 5, 11, 17, 23, 29, 35];
    const compressed = compressSequence(seq);
    assert.deepStrictEqual(compressed, [0, 5, 35], 'Should compress straight runs to turning points');
    console.log('✅ Test 5: Sequence compression passed');
}

// Test 6: 2D Grid input format
{
    const grid = [
        [1, 0, 0, 0],
        [0, 0, 0, 2],
        [3, 0, 0, 0],
        [0, 0, 5, 4]
    ];
    const path = solveZip(grid);
    assert.strictEqual(path.length, 16, '2D grid should solve to 16 cells');
    console.log('✅ Test 6: 2D grid matrix input passed');
}

// Test 7: Blocked cell support
{
    const path = solveZip({
        rows: 3,
        cols: 3,
        numberedCells: [0, 3],
        downWalls: [],
        rightWalls: [],
        blockedCells: [4] // middle cell blocked
    });
    assert.strictEqual(path.length, 8, '3x3 with 1 blocked cell should visit 8 cells');
    assert.ok(!path.indices.includes(4), 'Blocked cell 4 should not be in path');
    console.log('✅ Test 7: Blocked cell avoidance passed');
}

console.log('🎉 All tests passed successfully!');
