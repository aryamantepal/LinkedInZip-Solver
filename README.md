# LinkedIn Zip Solver 🎯

A Chrome extension that automatically solves LinkedIn's Zip puzzle game. Beat your friends with perfect solutions every time!

## 🚀 Quick Setup

1. **Download/Clone** this repository
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right)
4. **Click "Load unpacked"** and select the extension folder
5. **Navigate to** `linkedin.com/games` and start a Zip puzzle

## 🎮 How to Use

Once you're on a LinkedIn Zip puzzle:

1. **Look for the blue control panel** in the top-right corner
2. **Click "Solve"** - Analyzes the puzzle and finds the solution
3. **Click "Show Solution"** - Highlights the winning path in green with step numbers
4. **Click "Auto Play"** - Automatically solves the puzzle for you
5. **Click "Clear"** - Removes highlights

## 🔧 Files Structure

```
linkedin-zip-solver/
├── manifest.json    # Extension configuration
├── content.js       # Main coordinator and UI
├── solver.js        # Puzzle solving algorithm (DFS)
├── overlay.js       # Visual solution highlighting
└── popup.html       # Extension popup (optional)
```

## 🧠 How It Works

- **Grid Detection**: Automatically detects the puzzle grid and numbered checkpoints
- **Smart Solving**: Uses depth-first search (DFS) to find a path that visits all cells while hitting checkpoints in order
- **Visual Feedback**: Shows the solution path with step-by-step numbering
- **Auto-play**: Can automatically click through the solution

## 🛠️ Troubleshooting

**Extension not showing up?**
- Make sure all files are in the same folder
- Check that Developer Mode is enabled
- Try reloading the extension

**Control panel not appearing?**
- Refresh the LinkedIn games page
- Check browser console (F12) for errors
- Make sure you're on a Zip puzzle page

**Solution not working?**
- The puzzle layout might have changed - check console for debugging info
- Try refreshing and re-solving

## ⚠️ Disclaimer

This extension is for educational purposes and friendly competition. Use responsibly and remember that the fun of puzzles often comes from solving them yourself!

## 🤝 Contributing

Feel free to improve the algorithm, add features, or fix bugs. The solver uses a basic DFS approach that could potentially be optimized further.

---

*Now go beat your friends at LinkedIn Zip! 🏆*