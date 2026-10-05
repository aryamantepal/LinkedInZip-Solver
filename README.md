# LinkedIn Zip Solver ⚡🎯

A Chrome extension and standalone solver that automatically detects, solves, and auto-plays LinkedIn's daily **Zip** puzzle game.

## 🚀 Quick Setup

1. **Clone this repository**:
   ```bash
   git clone https://github.com/aryamantepal/LinkedInZip-Solver.git
   cd LinkedInZip-Solver
   ```
2. **Open Google Chrome** and navigate to `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in the top-right corner)
4. **Click "Load unpacked"** and select the `LinkedInZip-Solver` directory
5. **Navigate to [LinkedIn Games: Zip](https://www.linkedin.com/games/zip/)** and start a puzzle!

## 🎮 How to Use

When viewing a LinkedIn Zip puzzle:

1. **Floating Control Panel**: A sleek draggable widget appears on the top-right of the puzzle screen:
   - **🧩 Solve**: Analyzes the board (or extracts hydration data) and computes the exact winning path in <5ms.
   - **👁 Show Path**: Overlays an SVG glowing path connecting cell centers with step numbers (1 to N).
   - **▶ Auto Play**: Programmatically plays the solution moves via synthetic pointer/mouse cycles. Click again to stop anytime.
   - **🗑 Clear Overlays**: Cleans up SVG overlays and highlights.
   - **_**: Minimize or expand the control widget.
2. **Extension Popup**: Click the extension icon in Chrome's toolbar to check game detection status and trigger actions directly from the popup.

## 🧠 Features & Architecture

- **Multi-Tier Grid Scraper**:
  - **Tier 1 (Hydration Data)**: Extracts pre-rendered solutions directly from SSR hydration state when present for instant zero-overhead solving.
  - **Tier 2 (Interactive Grid DOM)**: Scrapes modern `[data-cell-idx]`, CSS variables (`--rows`, `--cols`), walls (`.trail-cell-wall--*`), and checkpoints.
  - **Tier 3 (Visual Bounding Clustering)**: Fallback algorithm that groups any layout of cells by screen coordinates, immune to class name obfuscation.
  - **Iframe Support**: Configured with `all_frames: true` to seamlessly operate whether LinkedIn runs the game on the main page or embedded within an iframe.
- **High-Performance Bitfield Solver (`ZipGrid`)**:
  - Implements Hamiltonian path resolution with Warnsdorff & degree isolation pruning.
  - Supports checkpoints in ascending sequence, horizontal/vertical walls, and blocked cells.
  - Solves typical 6x6 grids in **2–8 milliseconds**.
- **Sequence Compression**:
  - Compresses straight runs into key turning waypoints for fast, natural auto-play interaction.
- **Visual SVG Overlay**:
  - Renders glowing paths, directional arrows, and step badges.
  - Dynamically recalculates center points on window resize.
- **Manifest V3 CSP Compliant**:
  - Modular scripts with external `popup.js`, compliant with Chrome Web Store and Manifest V3 policies.

## 🔧 File Structure

```
LinkedInZip-Solver/
├── manifest.json     # Chrome Extension Manifest V3 configuration
├── content.js        # DOM scraper, coordinator, UI panel, and auto-player
├── solver.js         # ZipGrid bitfield Hamiltonian path solver & sequence compression
├── overlay.js        # SVG path renderer and visual step badges
├── index.html        # Extension popup markup
├── popup.js          # Extension popup script (Manifest V3 CSP compliant)
├── test.js           # Automated test suite (run with `node test.js`)
├── solve/
│   └── sol.py        # Standalone Python reference solver with degree pruning
└── README.md
```

## 🧪 Testing

Run the test suite with Node.js:

```bash
node test.js
```

Run the standalone Python solver:

```bash
python3 solve/sol.py
```

## ⚠️ Disclaimer

This extension is for educational and personal entertainment purposes. Puzzles are fun to solve—use responsibly!