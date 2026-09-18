# The Traveler's Path — A Field Guide to A* Search 🧭

[![License: MIT](https://img.shields.io/badge/License-MIT-plum.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A single-page interactive web application and technical field guide teaching the **A* Search Pathfinding Algorithm**. Designed with a hand-illustrated storybook theme crossed with a technical field notebook.

---

## 📖 Project Overview

**The Traveler's Path** bridges the gap between theoretical algorithm study and interactive visual intuition. Rather than presenting pathfinding as a dry matrix execution, it frames state space expansion through an elegant field guide interface—balancing historical path costs $g(n)$ and prospective heuristic distance $h(n)$.

---

## ✨ Key Features

- **🧭 Interactive Pathfinding Visualizer**:
  - Draw custom obstacles (thickets) and erase grid tiles on demand.
  - Reposition the Traveler (Start `✦`) and Clearing (Goal `◆`) anywhere on the grid.
  - Controls for automated playback (**Set off**), single-step execution (**Step once**), speed control, and grid resetting.

- **📐 Distance Heuristics Comparison**:
  - **Manhattan Distance**: Grid-based 4-directional search ($|dx| + |dy|$).
  - **Euclidean Distance**: Straight-line spatial distance ($\sqrt{dx^2 + dy^2}$).
  - **Diagonal / Octile Metric**: Chebyshev-esque distance for 8-directional grids.

- **💡 First-Timer Operator Guide**:
  - Built-in 3-step walkthrough banner ensuring new users immediately understand how to draw terrain, select heuristics, and observe state transitions.

- **🌗 Dark Mode & Light Mode**:
  - Toggle between dark nocturnal parchment (`#1c1624`) and light warm paper (`#f2e8e1`) themes with smooth CSS variable transitions.
  - Automatically respects system `prefers-color-scheme` settings.

- **💻 Developer-Grade Pseudocode Specification**:
  - Annotated pseudocode with syntax highlighting rendered using **Fira Code** monospace typography.
  - Complete Big-O asymptotic analysis ($O(E \log V)$ time with Min-Heap, $O(V)$ space).

- **🌟 Real-World Application Vignettes**:
  - Highlights practical use cases in Game AI pathfinding, GPS navigation networks, and autonomous robotics kinematics.

---

## 🧮 Algorithm Formula Breakdown

At each step, A* prioritizes candidate state transitions using a composite evaluation score:

$$f(n) = g(n) + h(n)$$

| Term | Concept | Description |
| :--- | :--- | :--- |
| **$g(n)$** | Path Cost So Far | The exact accumulated movement cost from the origin to state $n$. |
| **$h(n)$** | Heuristic Estimate | An admissible estimate of the minimum remaining cost from state $n$ to the goal. |
| **$f(n)$** | Priority Score | The combined evaluation score determining priority queue expansion order. |

---

## 🛠️ Technology Stack

- **Markup & Structure**: HTML5 Semantic Elements
- **Styling & Layout**: Custom CSS3 Variables, Responsive Flexbox & CSS Grid, SVG Filters
- **Typography**: Google Fonts (*Fraunces*, *Karla*, *Caveat*, *Fira Code*)
- **Scripting & Logic**: Vanilla ES6+ JavaScript (HTML5 Canvas & Grid DOM API)

---

## 🚀 Running Locally

No build tools or external npm dependencies are required.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Barkha777/CD24011_A-_SearchAlgo.git
   cd CD24011_A-_SearchAlgo
   ```

2. **Launch a local static web server**:
   ```bash
   # Using Python 3
   python -m http.server 8080

   # Or using Node.js serve
   npx serve .
   ```

3. **Open in Browser**:
   Navigate to `http://localhost:8080/index.html` in your web browser.

---

## 📁 Repository Structure

```
CD24011_A-_SearchAlgo/
├── index.html     # Main HTML structure, theme switcher, interactive sections & visualizer UI
├── styles.css     # Dusk & parchment color palette, typography, responsive card styles
├── app.js         # Min-Heap priority queue, A* algorithm step recorder, canvas visualizer engine
└── README.md      # Comprehensive project documentation
```

---

## 📜 License

Distributed under the MIT License. Feel free to use, modify, and distribute for educational purposes.