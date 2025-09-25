from collections import deque

grid = [
    [1, 0, 0],
    [0, 2, 3],
    [0, 0, 4],
    [0, 0, 5],
]

rows, cols = len(grid), len(grid[0])
positions = {}

for r in range(rows):
    for c in range(cols):
        if grid[r][c] > 0:
            positions[grid[r][c]] = (r, c)

moves = {
    (1, 0): "down",
    (-1, 0): "up",
    (0, 1): "right",
    (0, -1): "left"
}

def in_bounds(r, c):
    return 0 <= r < rows and 0 <= c < cols

def bfs_path(start, end, visited):
    """Find shortest path from start to end, visiting only unvisited cells if possible."""
    q = deque([(start, [])])
    seen = {start}
    while q:
        (r, c), path = q.popleft()
        if (r, c) == end:
            return path
        for (dr, dc), move in moves.items():
            nr, nc = r+dr, c+dc
            if in_bounds(nr, nc) and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append(((nr, nc), path + [move]))
    return []  # shouldn't happen

# Build the full traversal
visited = set()
full_path = []
for k in range(1, 5):
    start = positions[k]
    end = positions[k+1]
    visited.add(start)
    steps = bfs_path(start, end, visited)
    full_path.extend(steps)

print("Order of numbers:", [1,2,3,4,5])
print("Traversal path:", " -> ".join(full_path))
