/* ==========================================================================
   A* SEARCH FIELD GUIDE - INTERACTIVE ENGINE & ALGORITHM LOGIC
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. MinHeap Priority Queue Implementation for A*
// --------------------------------------------------------------------------
class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  push(element, priority) {
    const node = { element, priority };
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.isEmpty()) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._sinkDown(0);
    }
    return top.element;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIdx].priority) break;
      [this.heap[index], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[index]];
      index = parentIdx;
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const leftIdx = 2 * index + 1;
      const rightIdx = 2 * index + 2;

      if (leftIdx < length && this.heap[leftIdx].priority < this.heap[smallest].priority) {
        smallest = leftIdx;
      }
      if (rightIdx < length && this.heap[rightIdx].priority < this.heap[smallest].priority) {
        smallest = rightIdx;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

// --------------------------------------------------------------------------
// 2. Main Visualizer Controller
// --------------------------------------------------------------------------
class PathfindingVisualizer {
  constructor() {
    this.canvas = document.getElementById('gridCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Grid Dimensions
    this.rows = 18;
    this.cols = 28;
    this.cellSize = 24;

    // Grid Node States
    this.grid = []; // Array of arrays: { r, c, isWall, weight, g, h, f, parent, state }
    this.startNode = { r: 9, c: 4 };
    this.endNode = { r: 9, c: 23 };

    // Interaction Modes
    this.currentTool = 'wall'; // 'wall', 'weight', 'start', 'end', 'erase'
    this.isMouseDown = false;
    this.draggedElement = null; // 'start' or 'end' if dragging

    // Heuristic Settings
    this.currentHeuristic = 'manhattan'; // 'manhattan', 'euclidean', 'octile'

    // Playback State
    this.stepsRecorded = [];
    this.currentStepIdx = 0;
    this.isPlaying = false;
    this.animationTimer = null;
    this.playbackSpeed = 40; // ms per step

    // Spirit Path Walker Particle Animation
    this.pathWalker = {
      active: false,
      path: [],
      progress: 0,
      speed: 0.06
    };

    this.audioEnabled = false;
    this.audioCtx = null;

    this.init();
  }

  init() {
    this.resizeCanvas();
    this.resetGrid();
    this.attachEventListeners();
    this.loadPreset('forest');
    this.render();

    // Redraw canvas on window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
  }

  resizeCanvas() {
    const wrapper = this.canvas.parentElement;
    const availableWidth = wrapper.clientWidth - 20;
    this.cellSize = Math.floor(availableWidth / this.cols);
    this.canvas.width = this.cols * this.cellSize;
    this.canvas.height = this.rows * this.cellSize;
  }

  resetGrid() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          r,
          c,
          isWall: false,
          weight: 1, // 1 normal, 3 mud/thicket
          g: Infinity,
          h: Infinity,
          f: Infinity,
          parent: null,
          state: 'unvisited' // 'unvisited', 'open', 'closed', 'path', 'current'
        });
      }
      this.grid.push(row);
    }
    this.stopAnimation();
    this.pathWalker.active = false;
    this.clearAlgorithmState();
  }

  clearAlgorithmState() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        cell.g = Infinity;
        cell.h = Infinity;
        cell.f = Infinity;
        cell.parent = null;
        cell.state = 'unvisited';
      }
    }
    this.stepsRecorded = [];
    this.currentStepIdx = 0;
    this.pathWalker.active = false;
    this.updateStats(0, 0, 0);
  }

  // Heuristic Calculators
  calculateHeuristic(r1, c1, r2, c2) {
    const dx = Math.abs(c1 - c2);
    const dy = Math.abs(r1 - r2);
    if (this.currentHeuristic === 'manhattan') {
      return (dx + dy) * 10;
    } else if (this.currentHeuristic === 'euclidean') {
      return Math.round(Math.sqrt(dx * dx + dy * dy) * 10);
    } else if (this.currentHeuristic === 'octile') {
      // Diagonal cost sqrt(2)*10 ~ 14, straight 10
      return Math.round(10 * (dx + dy) + (14 - 2 * 10) * Math.min(dx, dy));
    }
    return (dx + dy) * 10;
  }

  // --------------------------------------------------------------------------
  // 3. A* Search Core Algorithm
  // --------------------------------------------------------------------------
  runAStar() {
    this.clearAlgorithmState();
    const startTime = performance.now();

    const openSet = new PriorityQueue();
    const startCell = this.grid[this.startNode.r][this.startNode.c];
    const endCell = this.grid[this.endNode.r][this.endNode.c];

    startCell.g = 0;
    startCell.h = this.calculateHeuristic(startCell.r, startCell.c, endCell.r, endCell.c);
    startCell.f = startCell.g + startCell.h;

    openSet.push(startCell, startCell.f);
    startCell.state = 'open';

    this.stepsRecorded = [];
    this.recordStep(startCell, 'open');

    let foundPath = false;
    let nodesExploredCount = 0;

    // Neighbor movements: Up, Down, Left, Right + Diagonals (if octile)
    const dirs = [
      { dr: -1, dc: 0, cost: 10 },
      { dr: 1, dc: 0, cost: 10 },
      { dr: 0, dc: -1, cost: 10 },
      { dr: 0, dc: 1, cost: 10 }
    ];

    if (this.currentHeuristic === 'octile') {
      dirs.push(
        { dr: -1, dc: -1, cost: 14 },
        { dr: -1, dc: 1, cost: 14 },
        { dr: 1, dc: -1, cost: 14 },
        { dr: 1, dc: 1, cost: 14 }
      );
    }

    while (!openSet.isEmpty()) {
      const current = openSet.pop();

      // If current node has already been closed with a better cost, skip
      if (current.state === 'closed') continue;

      nodesExploredCount++;
      current.state = 'closed';
      this.recordStep(current, 'closed');

      if (current.r === endCell.r && current.c === endCell.c) {
        foundPath = true;
        break;
      }

      for (const dir of dirs) {
        const nr = current.r + dir.dr;
        const nc = current.c + dir.dc;

        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          const neighbor = this.grid[nr][nc];
          if (neighbor.isWall) continue;

          // Corner cutting prevention for diagonal movement
          if (dir.dr !== 0 && dir.dc !== 0) {
            if (this.grid[current.r][nc].isWall || this.grid[nr][current.c].isWall) {
              continue;
            }
          }

          const moveCost = dir.cost * neighbor.weight;
          const tentativeG = current.g + moveCost;

          if (tentativeG < neighbor.g) {
            neighbor.parent = current;
            neighbor.g = tentativeG;
            neighbor.h = this.calculateHeuristic(neighbor.r, neighbor.c, endCell.r, endCell.c);
            neighbor.f = neighbor.g + neighbor.h;

            if (neighbor.state !== 'open') {
              neighbor.state = 'open';
              openSet.push(neighbor, neighbor.f);
              this.recordStep(neighbor, 'open');
            }
          }
        }
      }
    }

    const endTime = performance.now();
    const execTime = Math.round(endTime - startTime);

    // Reconstruct Path if found
    let finalPath = [];
    let pathCost = 0;
    if (foundPath) {
      let curr = endCell;
      while (curr) {
        finalPath.unshift(curr);
        curr.state = 'path';
        this.recordStep(curr, 'path');
        curr = curr.parent;
      }
      pathCost = endCell.g / 10;
    }

    this.recordedStats = {
      nodesExplored: nodesExploredCount,
      pathLength: finalPath.length,
      pathCost: pathCost,
      execTime: execTime,
      finalPath: finalPath
    };

    return foundPath;
  }

  recordStep(cell, state) {
    this.stepsRecorded.push({
      r: cell.r,
      c: cell.c,
      state: state,
      g: cell.g,
      h: cell.h,
      f: cell.f
    });
  }

  // Playback Control Methods
  play() {
    if (this.isPlaying) return;
    if (this.stepsRecorded.length === 0) {
      const found = this.runAStar();
      if (!found) {
        alert("No path exists through these enchanted obstacles!");
      }
    }

    this.isPlaying = true;
    document.getElementById('playPauseBtn').innerText = '⏸ Pause';
    this.animateStep();
  }

  pause() {
    this.isPlaying = false;
    document.getElementById('playPauseBtn').innerText = '▶ Play';
    if (this.animationTimer) clearTimeout(this.animationTimer);
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  stepForward() {
    this.pause();
    if (this.stepsRecorded.length === 0) {
      this.runAStar();
    }
    if (this.currentStepIdx < this.stepsRecorded.length) {
      this.applyStep(this.currentStepIdx);
      this.currentStepIdx++;
      this.render();
      if (this.audioEnabled) this.playTone(300 + (this.currentStepIdx % 40) * 10, 0.05);
    }
  }

  stopAnimation() {
    this.pause();
    this.currentStepIdx = 0;
  }

  animateStep() {
    if (!this.isPlaying) return;

    if (this.currentStepIdx < this.stepsRecorded.length) {
      // Process a batch of steps based on speed setting
      const batchSize = Math.max(1, Math.floor(100 / this.playbackSpeed));
      for (let i = 0; i < batchSize && this.currentStepIdx < this.stepsRecorded.length; i++) {
        this.applyStep(this.currentStepIdx);
        this.currentStepIdx++;
      }

      this.render();
      this.animationTimer = setTimeout(() => this.animateStep(), Math.max(10, this.playbackSpeed));
    } else {
      this.pause();
      if (this.recordedStats) {
        this.updateStats(this.recordedStats.nodesExplored, this.recordedStats.pathCost, this.recordedStats.execTime);
        this.startPathWalker(this.recordedStats.finalPath);
        if (this.audioEnabled) this.playChime();
      }
    }
  }

  applyStep(idx) {
    const step = this.stepsRecorded[idx];
    if (step) {
      const cell = this.grid[step.r][step.c];
      cell.state = step.state;
      cell.g = step.g;
      cell.h = step.h;
      cell.f = step.f;
    }
  }

  // --------------------------------------------------------------------------
  // 4. Rendering & Visual Style Logic
  // --------------------------------------------------------------------------
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Background & Grid lines
    this.ctx.fillStyle = '#F4EFE6';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Cells
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        const x = c * this.cellSize;
        const y = r * this.cellSize;

        // Draw Cell Background
        let fillColor = null;
        if (cell.isWall) {
          fillColor = '#36324A'; // Shadowy Tree / Wall
        } else if (cell.state === 'path') {
          fillColor = '#F0A35B'; // Glowing Amber Path
        } else if (cell.state === 'closed') {
          fillColor = '#AA97BD'; // Dusty Lavender Visited
        } else if (cell.state === 'open') {
          fillColor = '#8CA9C4'; // Sky Mist Frontier
        } else if (cell.weight > 1) {
          fillColor = '#D8C6A5'; // Mud / Forest Thicket
        }

        if (fillColor) {
          this.ctx.fillStyle = fillColor;
          this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
        }

        // Cell Borders (Sketchy paper feel)
        this.ctx.strokeStyle = '#E2D9C8';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        // Draw Mud Weight Icon if weighted
        if (cell.weight > 1 && !cell.isWall && cell.state === 'unvisited') {
          this.ctx.fillStyle = '#786C50';
          this.ctx.font = `${Math.floor(this.cellSize * 0.5)}px sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('🌿', x + this.cellSize / 2, y + this.cellSize / 2);
        }
      }
    }

    // Draw Start Compass Icon
    const startX = this.startNode.c * this.cellSize;
    const startY = this.startNode.r * this.cellSize;
    this.ctx.fillStyle = '#487A9E';
    this.ctx.fillRect(startX + 2, startY + 2, this.cellSize - 4, this.cellSize - 4);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `${Math.floor(this.cellSize * 0.6)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🧭', startX + this.cellSize / 2, startY + this.cellSize / 2);

    // Draw Goal Lantern Icon
    const endX = this.endNode.c * this.cellSize;
    const endY = this.endNode.r * this.cellSize;
    this.ctx.fillStyle = '#E47A5A';
    this.ctx.fillRect(endX + 2, endY + 2, this.cellSize - 4, this.cellSize - 4);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `${Math.floor(this.cellSize * 0.6)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🏮', endX + this.cellSize / 2, endY + this.cellSize / 2);

    // Render Path Walker Spirit if active
    if (this.pathWalker.active && this.pathWalker.path.length > 0) {
      this.renderPathWalker();
    }
  }

  // --------------------------------------------------------------------------
  // 5. Spirit Path Walker Particle Trail
  // --------------------------------------------------------------------------
  startPathWalker(path) {
    if (!path || path.length === 0) return;
    this.pathWalker.path = path;
    this.pathWalker.progress = 0;
    this.pathWalker.active = true;
    this.animateWalker();
  }

  animateWalker() {
    if (!this.pathWalker.active) return;

    this.pathWalker.progress += this.pathWalker.speed;
    if (this.pathWalker.progress >= this.pathWalker.path.length - 1) {
      this.pathWalker.progress = this.pathWalker.path.length - 1;
      this.render();
      setTimeout(() => { this.pathWalker.active = false; }, 1000);
      return;
    }

    this.render();
    requestAnimationFrame(() => this.animateWalker());
  }

  renderPathWalker() {
    const idx = Math.floor(this.pathWalker.progress);
    const frac = this.pathWalker.progress - idx;

    const currNode = this.pathWalker.path[idx];
    const nextNode = this.pathWalker.path[Math.min(idx + 1, this.pathWalker.path.length - 1)];

    const currX = (currNode.c + 0.5) * this.cellSize;
    const currY = (currNode.r + 0.5) * this.cellSize;
    const nextX = (nextNode.c + 0.5) * this.cellSize;
    const nextY = (nextNode.r + 0.5) * this.cellSize;

    const walkerX = currX + (nextX - currX) * frac;
    const walkerY = currY + (nextY - currY) * frac;

    // Glowing Firefly Sprite
    this.ctx.beginPath();
    this.ctx.arc(walkerX, walkerY, this.cellSize * 0.4, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(245, 208, 97, 0.5)';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(walkerX, walkerY, this.cellSize * 0.2, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
  }

  // --------------------------------------------------------------------------
  // 6. User Interactions & Tooling
  // --------------------------------------------------------------------------
  attachEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());

    // Mobile Touch Support
    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.handleMouseDown(touch);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      this.handleMouseMove(touch);
    });
    this.canvas.addEventListener('touchend', () => this.handleMouseUp());

    // Tools & Controls Listeners
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
      });
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadPreset(btn.dataset.preset);
      });
    });

    // Playback Buttons
    document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlay());
    document.getElementById('stepBtn').addEventListener('click', () => this.stepForward());
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearAlgorithmState();
      this.render();
    });
    document.getElementById('resetWallsBtn').addEventListener('click', () => {
      this.resetGrid();
      this.render();
    });

    // Speed Slider
    document.getElementById('speedSlider').addEventListener('input', (e) => {
      this.playbackSpeed = 105 - parseInt(e.target.value);
    });

    // Heuristics Radios
    document.querySelectorAll('input[name="heuristic"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.currentHeuristic = e.target.value;
        if (this.stepsRecorded.length > 0) {
          this.runAStar();
          this.play();
        }
      });
    });
  }

  getGridPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / this.cellSize);
    const r = Math.floor(y / this.cellSize);
    return { r: Math.max(0, Math.min(this.rows - 1, r)), c: Math.max(0, Math.min(this.cols - 1, c)) };
  }

  handleMouseDown(e) {
    this.isMouseDown = true;
    const { r, c } = this.getGridPos(e);

    if (r === this.startNode.r && c === this.startNode.c) {
      this.draggedElement = 'start';
    } else if (r === this.endNode.r && c === this.endNode.c) {
      this.draggedElement = 'end';
    } else {
      this.applyTool(r, c);
    }
    this.inspectCell(r, c);
  }

  handleMouseMove(e) {
    const { r, c } = this.getGridPos(e);
    this.inspectCell(r, c);

    if (!this.isMouseDown) return;

    if (this.draggedElement === 'start') {
      if (!this.grid[r][c].isWall && (r !== this.endNode.r || c !== this.endNode.c)) {
        this.startNode = { r, c };
        this.clearAlgorithmState();
        this.render();
      }
    } else if (this.draggedElement === 'end') {
      if (!this.grid[r][c].isWall && (r !== this.startNode.r || c !== this.startNode.c)) {
        this.endNode = { r, c };
        this.clearAlgorithmState();
        this.render();
      }
    } else {
      this.applyTool(r, c);
    }
  }

  handleMouseUp() {
    this.isMouseDown = false;
    this.draggedElement = null;
  }

  applyTool(r, c) {
    if ((r === this.startNode.r && c === this.startNode.c) || (r === this.endNode.r && c === this.endNode.c)) return;

    const cell = this.grid[r][c];
    if (this.currentTool === 'wall') {
      cell.isWall = true;
      cell.weight = 1;
    } else if (this.currentTool === 'weight') {
      cell.isWall = false;
      cell.weight = 3; // Mud / Forest Thicket cost
    } else if (this.currentTool === 'erase') {
      cell.isWall = false;
      cell.weight = 1;
    }
    this.clearAlgorithmState();
    this.render();
  }

  inspectCell(r, c) {
    const cell = this.grid[r][c];
    document.getElementById('inspectCoords').innerText = `Cell (${r}, ${c})`;
    document.getElementById('inspectG').innerText = cell.g === Infinity ? '∞' : (cell.g / 10).toFixed(1);
    document.getElementById('inspectH').innerText = cell.h === Infinity ? '∞' : (cell.h / 10).toFixed(1);
    document.getElementById('inspectF').innerText = cell.f === Infinity ? '∞' : (cell.f / 10).toFixed(1);
    document.getElementById('inspectState').innerText = cell.isWall ? 'Obstacle' : cell.state;
  }

  updateStats(explored, cost, time) {
    document.getElementById('statNodes').innerText = explored;
    document.getElementById('statCost').innerText = cost > 0 ? cost.toFixed(1) : '-';
    document.getElementById('statTime').innerText = `${time} ms`;
  }

  // --------------------------------------------------------------------------
  // 7. Map Presets
  // --------------------------------------------------------------------------
  loadPreset(name) {
    this.resetGrid();

    if (name === 'forest') {
      this.startNode = { r: 9, c: 3 };
      this.endNode = { r: 9, c: 24 };
      // Scattered forest trees wall pattern
      for (let r = 3; r < 15; r++) {
        this.grid[r][12].isWall = true;
      }
      this.grid[6][12].isWall = false; // Secret gap
      this.grid[12][12].isWall = false;

      for (let r = 0; r < 9; r++) {
        this.grid[r][18].isWall = true;
      }
      for (let r = 10; r < 18; r++) {
        this.grid[r][7].isWall = true;
      }
    } else if (name === 'labyrinth') {
      this.startNode = { r: 2, c: 2 };
      this.endNode = { r: 15, c: 25 };
      // Spiral Labyrinth
      for (let c = 4; c < 24; c++) this.grid[4][c].isWall = true;
      for (let r = 4; r < 14; r++) this.grid[r][23].isWall = true;
      for (let c = 8; c < 24; c++) this.grid[13][c].isWall = true;
      for (let r = 8; r < 14; r++) this.grid[r][8].isWall = true;
    } else if (name === 'archipelago') {
      this.startNode = { r: 4, c: 4 };
      this.endNode = { r: 14, c: 23 };
      // Weighted Muddy Swamp terrain
      for (let r = 5; r < 13; r++) {
        for (let c = 10; c < 18; c++) {
          this.grid[r][c].weight = 3;
        }
      }
      for (let r = 2; r < 16; r += 3) {
        this.grid[r][14].isWall = true;
      }
    } else if (name === 'empty') {
      this.startNode = { r: 9, c: 4 };
      this.endNode = { r: 9, c: 23 };
    }

    this.render();
  }

  // --------------------------------------------------------------------------
  // 8. Synthesized Web Audio API Chimes
  // --------------------------------------------------------------------------
  playTone(freq, duration) {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (err) {}
  }

  playChime() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.4), idx * 100);
    });
  }
}

// --------------------------------------------------------------------------
// 9. Interactive Page Elements & Algorithm Comparison Tabs
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const visualizer = new PathfindingVisualizer();

  // Formula Explorer Interactive Card Click
  const formulaParts = document.querySelectorAll('.formula-part');
  const expCards = document.querySelectorAll('.exp-card');

  formulaParts.forEach(part => {
    part.addEventListener('click', () => {
      const target = part.dataset.target;
      formulaParts.forEach(p => p.classList.remove('active'));
      part.classList.add('active');

      expCards.forEach(card => {
        if (card.classList.contains(`${target}-card`)) {
          card.style.transform = 'scale(1.03)';
          card.style.boxShadow = '0 4px 12px rgba(41,38,57,0.1)';
        } else {
          card.style.transform = 'scale(1)';
          card.style.boxShadow = 'none';
        }
      });
    });
  });

  // Algorithm Comparison Tabs
  const algoTabs = document.querySelectorAll('.algo-tab');
  const algoDesc = document.getElementById('algoDesc');

  const algoTextMap = {
    dijkstra: "<strong>Dijkstra's Algorithm:</strong> Considers only <em>g(n)</em> (cost so far). It explores outward evenly in all directions like ripples in a pond, guaranteeing the shortest path but exploring many unnecessary nodes.",
    greedy: "<strong>Greedy Best-First Search:</strong> Considers only <em>h(n)</em> (heuristic distance to target). It aggressively rushes toward the destination, making it fast, but can easily get trapped by wall dead-ends.",
    astar: "<strong>A* Search Algorithm:</strong> Combines history <em>g(n)</em> and vision <em>h(n)</em> through <em>f(n) = g(n) + h(n)</em>. It explores intelligently towards the goal while guaranteeing the shortest path."
  };

  algoTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      algoTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      algoDesc.innerHTML = algoTextMap[tab.dataset.algo];
    });
  });

  // Audio Toggle Button
  const audioBtn = document.getElementById('audioToggleBtn');
  audioBtn.addEventListener('click', () => {
    visualizer.audioEnabled = !visualizer.audioEnabled;
    audioBtn.innerText = visualizer.audioEnabled ? '🔔' : '🔕';
  });
});
