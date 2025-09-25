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
    """BFS that prefers unvisited cells, returns path of moves from start to end."""
    q = deque([(start, [])])
    seen = {start}
    while q:
        (r, c), path = q.popleft()
        if (r, c) == end:
            return path
        for (dr, dc), move in moves.items():
            nr, nc = r + dr, c + dc
            if in_bounds(nr, nc) and (nr, nc) not in seen:
                # prefer unvisited cells (zeros not yet seen)
                priority = (nr, nc) not in visited
                seen.add((nr, nc))
                if priority:
                    q.appendleft(((nr, nc), path + [move]))  # explore unvisited first
                else:
                    q.append(((nr, nc), path + [move]))
    return []

# Build the full traversal
visited = set()
full_path = []
visited.add(positions[1])  # mark start as visited

for k in range(1, 5):
    start = positions[k]
    end = positions[k+1]
    steps = bfs_path(start, end, visited)
    
    # replay the moves to update visited along the way
    r, c = start
    for move in steps:
        for (dr, dc), mname in moves.items():
            if mname == move:
                r, c = r + dr, c + dc
                visited.add((r, c))
                break
    full_path.extend(steps)

print("Order of numbers:", [1,2,3,4,5])
print("Traversal path:", " -> ".join(full_path))
print("Visited all?", len(visited) == rows * cols)
