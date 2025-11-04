import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { pixelToSeconds } from './utils.js';

// Interface : forme d'onde + barres de trim
export default class SamplerGUI {
  constructor(canvas, overlay) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.wave = new WaveformDrawer();
    // Initialisation des barres de trim
    const leftInit = Math.round((canvas.width || 600) * 0.08);
    const rightInit = Math.round((canvas.width || 600) * 0.5);
    this.trims = new TrimbarsDrawer(overlay, leftInit, rightInit);
    this.currentBuffer = null;

    const mousePos = { x: 0, y: 0 };
    // Souris : suivre le déplacement
    overlay.addEventListener('mousemove', (evt) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.x = (evt.clientX - rect.left);
      mousePos.y = (evt.clientY - rect.top);
      this.trims.moveTrimBars(mousePos);
    });
    overlay.addEventListener('mousedown', () => this.trims.startDrag());
    // Relâcher le glisser même si le curseur sort de la zone
    window.addEventListener('mouseup', () => this.trims.stopDrag());

    const tick = () => { this.trims.clear(); this.trims.draw(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  setBuffer(buffer) {
    this.currentBuffer = buffer;
    if (!buffer) return;
    this.wave.init(buffer, this.canvas, '#83E83E'); // vert simple
    this.wave.drawWave(0, this.canvas.height);
  }

  getSelectionSec() {
    if (!this.currentBuffer) return { start: 0, end: 0 };
    const start = pixelToSeconds(this.trims.leftTrimBar.x, this.currentBuffer.duration, this.canvas.width);
    const end = pixelToSeconds(this.trims.rightTrimBar.x, this.currentBuffer.duration, this.canvas.width);
    return { start, end };
  }

  // Obtenir/placer les trims en pixels
  getTrimPixels() {
    return { left: this.trims.leftTrimBar.x, right: this.trims.rightTrimBar.x };
  }
  setTrimPixels(left, right) {
    if (typeof left === 'number') this.trims.leftTrimBar.x = left;
    if (typeof right === 'number') this.trims.rightTrimBar.x = right;
  }
}
