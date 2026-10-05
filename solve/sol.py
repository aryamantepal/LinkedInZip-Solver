#!/usr/bin/env python3
"""
solve/sol.py - Standalone Python Hamiltonian Path Solver for LinkedIn Zip puzzles.
Features Warnsdorff / unvisited-degree pruning for fast solving on arbitrary grids.
"""

def solve_zip(rows, cols, numbered_cells, down_walls=None, right_walls=None, blocked_cells=None):
    down_walls = set(down_walls or [])
    right_walls = set(right_walls or [])
    blocked = set(blocked_cells or [])
    
    size = rows * cols
    valid_cells = set(range(size)) - blocked
    total_valid = len(valid_cells)
    
    if not numbered_cells:
        return None
        
    start_cell = numbered_cells[0]
    end_cell = numbered_cells[-1]
    
    # Precompute adjacency
    adj = {i: [] for i in range(size)}
    for r in range(rows):
        for c in range(cols):
            u = r * cols + c
            if u in blocked:
                continue
            # Right neighbor
            if c + 1 < cols and u not in right_walls and (u + 1) not in blocked:
                adj[u].append(u + 1)
                adj[u + 1].append(u)
            # Down neighbor
            if r + 1 < rows and u not in down_walls and (u + cols) not in blocked:
                adj[u].append(u + cols)
                adj[u + cols].append(u)
                
    # Checkpoint lookup
    cp_map = {idx: step + 1 for step, idx in enumerate(numbered_cells)}
    
    visited = set()
    degrees = {i: len(adj[i]) for i in range(size)}
    
    path = [start_cell]
    visited.add(start_cell)

    solution = []

    def dfs(u, cp_idx):
        if len(path) == total_valid:
            if cp_idx == len(numbered_cells):
                solution.extend(path)
                return True
            return False

        next_cp = numbered_cells[cp_idx] if cp_idx < len(numbered_cells) else None

        # Unvisited neighbors
        candidates = [v for v in adj[u] if v not in visited]
        candidates.sort(key=lambda v: degrees[v])

        for v in candidates:
            # Checkpoint constraint
            next_cp_idx = cp_idx
            if v in cp_map:
                if v == next_cp:
                    next_cp_idx = cp_idx + 1
                else:
                    continue

            # Isolation check: leaving u impacts other unvisited neighbors of u
            isolated = False
            for w in adj[u]:
                if w not in visited and w != v:
                    # w has remaining degree degrees[w]. Leaving u means w loses an edge.
                    # If w is end_cell and degrees[w] == 1 -> it will have 0 edges.
                    # If w is not end_cell and degrees[w] == 2 -> it will have 1 edge (cannot enter and leave).
                    if (w == end_cell and degrees[w] == 1) or (w != end_cell and degrees[w] == 2):
                        isolated = True
                        break
            if isolated:
                continue

            # Decrement degrees for neighbor leaving u
            for w in adj[u]:
                if w not in visited:
                    degrees[w] -= 1

            # Visit v
            visited.add(v)
            path.append(v)

            if dfs(v, next_cp_idx):
                return True

            # Backtrack
            visited.remove(v)
            path.pop()
            for w in adj[u]:
                if w not in visited:
                    degrees[w] += 1

        return False

    import time
    t0 = time.perf_counter()
    found = dfs(start_cell, 1)
    t1 = time.perf_counter()

    if found:
        print(f"[Python Solver] Solved in {(t1 - t0)*1000:.2f}ms. Total steps: {len(solution)}")
        return solution
    else:
        print(f"[Python Solver] No solution found in {(t1 - t0)*1000:.2f}ms.")
        return None


if __name__ == "__main__":
    print("Testing 6x6 Zip puzzle in Python...")
    test_path = solve_zip(
        rows=6,
        cols=6,
        numbered_cells=[0, 11, 12, 23, 24, 35, 30],
        down_walls=[],
        right_walls=[]
    )
    if test_path:
        coords = [(idx // 6, idx % 6) for idx in test_path]
        print("Path:", coords[:6], "...", coords[-3:])
