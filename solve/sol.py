# define graph
grid = [
    [1, 0, 0],
    [0, 2, 3],
    [0, 0, 4],
    [0, 0, 5],
]
# write dfs to traverse
rows = len(grid)
cols = len(grid[0])

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

def get_path(start, end):
    """Simple DFS to move from start to end and return path."""
    (sr, sc), (er, ec) = start, end
    path = []
    r, c = sr, sc
    # naive: move vertically, then horizontally
    while r < er:
        path.append("down")
        r += 1
    while r > er:
        path.append("up")
        r -= 1
    while c < ec:
        path.append("right")
        c += 1
    while c > ec:
        path.append("left")
        c -= 1
    return path

# produce output

full_path = []
for k in range(1, 5):
    start = positions[k]
    end = positions[k+1]
    steps = get_path(start, end)
    full_path.extend(steps)
    
print("Order of numbers:", [1,2,3,4,5])
print("Traversal path:", " -> ".join(full_path))

