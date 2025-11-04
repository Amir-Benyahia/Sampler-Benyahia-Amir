import { distance } from './utils.js';

// Barres de sélection (gauche/droite)
export default class TrimbarsDrawer {
  leftTrimBar = { x: 50, color: 'white', selected: false, dragged: false };
  rightTrimBar = { x: 300, color: 'white', selected: false, dragged: false };

  constructor(canvas, leftX, rightX) {
    this.canvas = canvas;
    if (typeof leftX === 'number') this.leftTrimBar.x = leftX;
    if (typeof rightX === 'number') this.rightTrimBar.x = rightX;
    this.ctx = canvas.getContext('2d');
  }

  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }

  draw() {
    let ctx = this.ctx; ctx.save();
    ctx.lineWidth = 2;
    // left line
    ctx.strokeStyle = this.leftTrimBar.color; ctx.beginPath();
    ctx.moveTo(this.leftTrimBar.x, 0); ctx.lineTo(this.leftTrimBar.x, this.canvas.height); ctx.stroke();
    // right line
    ctx.strokeStyle = this.rightTrimBar.color; ctx.beginPath();
    ctx.moveTo(this.rightTrimBar.x, 0); ctx.lineTo(this.rightTrimBar.x, this.canvas.height); ctx.stroke();
    // small triangles
    ctx.fillStyle = this.leftTrimBar.color; ctx.beginPath();
    ctx.moveTo(this.leftTrimBar.x, 0); ctx.lineTo(this.leftTrimBar.x + 10, 8); ctx.lineTo(this.leftTrimBar.x, 16); ctx.fill();
    ctx.fillStyle = this.rightTrimBar.color; ctx.beginPath();
    ctx.moveTo(this.rightTrimBar.x, 0); ctx.lineTo(this.rightTrimBar.x - 10, 8); ctx.lineTo(this.rightTrimBar.x, 16); ctx.fill();
    // greyed zones
    ctx.fillStyle = 'rgba(128,128,128,0.7)';
    ctx.fillRect(0, 0, this.leftTrimBar.x, this.canvas.height);
    ctx.fillRect(this.rightTrimBar.x, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  highLightTrimBarsWhenClose(mousePos) {
    let d = distance(mousePos.x, mousePos.y, this.leftTrimBar.x + 5, 4);
    if ((d < 10) && (!this.rightTrimBar.selected)) { this.leftTrimBar.color = 'red'; this.leftTrimBar.selected = true; }
    else { this.leftTrimBar.color = 'white'; this.leftTrimBar.selected = false; }
    d = distance(mousePos.x, mousePos.y, this.rightTrimBar.x - 5, 4);
    if ((d < 10) && (!this.leftTrimBar.selected)) { this.rightTrimBar.color = 'red'; this.rightTrimBar.selected = true; }
    else { this.rightTrimBar.color = 'white'; this.rightTrimBar.selected = false; }
  }

  startDrag() { if (this.leftTrimBar.selected) this.leftTrimBar.dragged = true; if (this.rightTrimBar.selected) this.rightTrimBar.dragged = true; }
  stopDrag() {
    if (this.leftTrimBar.dragged) { this.leftTrimBar.dragged = false; this.leftTrimBar.selected = false; if (this.leftTrimBar.x > this.rightTrimBar.x) this.leftTrimBar.x = this.rightTrimBar.x; }
    if (this.rightTrimBar.dragged) { this.rightTrimBar.dragged = false; this.rightTrimBar.selected = false; if (this.rightTrimBar.x < this.leftTrimBar.x) this.rightTrimBar.x = this.leftTrimBar.x; }
  }

  moveTrimBars(mousePos) {
    this.highLightTrimBarsWhenClose(mousePos);
    if (mousePos.x <= 0) this.leftTrimBar.x = 0;
    if (mousePos.x >= this.canvas.width) this.rightTrimBar.x = this.canvas.width;
    if (this.leftTrimBar.dragged) {
      if (this.leftTrimBar.x < this.rightTrimBar.x) this.leftTrimBar.x = mousePos.x;
      else { if (mousePos.x < this.rightTrimBar.x) this.leftTrimBar.x = mousePos.x; }
    }
    if (this.rightTrimBar.dragged) {
      if (this.rightTrimBar.x > this.leftTrimBar.x) this.rightTrimBar.x = mousePos.x;
      else { if (mousePos.x > this.rightTrimBar.x) this.rightTrimBar.x = mousePos.x; }
    }
  }
}
