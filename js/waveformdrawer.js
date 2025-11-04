// Dessine la waveform à partir des pics
export default class WaveformDrawer {
  decodedAudioBuffer;
  peaks;
  canvas;
  displayWidth;
  displayHeight;
  sampleStep;

  init(decodedAudioBuffer, canvas, color, sampleStep) {
    this.decodedAudioBuffer = decodedAudioBuffer;
    this.canvas = canvas;
    this.displayWidth = canvas.width;
    this.displayHeight = canvas.height;
    this.color = color;
    this.sampleStep = sampleStep;
    this.getPeaks();
  }

  max(values) {
    let max = -Infinity;
    for (let i = 0, len = values.length; i < len; i++) {
      let val = values[i];
      if (val > max) { max = val; }
    }
    return max;
  }

  drawWave(startY, height) {
    let ctx = this.canvas.getContext('2d');
    ctx.save();
    ctx.translate(0, startY);

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    let width = this.displayWidth;
    let coef = height / (2 * this.max(this.peaks));
    let halfH = height / 2;

    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(width, halfH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, halfH);
    for (let i = 0; i < width; i++) {
      let h = Math.round(this.peaks[i] * coef);
      ctx.lineTo(i, halfH + h);
    }
    ctx.lineTo(width, halfH);

    ctx.moveTo(0, halfH);
    for (let i = 0; i < width; i++) {
      let h = Math.round(this.peaks[i] * coef);
      ctx.lineTo(i, halfH - h);
    }
    ctx.lineTo(width, halfH);

    ctx.fill();
    ctx.restore();
  }

  getPeaks() {
    let buffer = this.decodedAudioBuffer;
    let sampleSize = Math.ceil(buffer.length / this.displayWidth);
    this.sampleStep = this.sampleStep || ~~(sampleSize / 10);
    if (this.sampleStep < 1) this.sampleStep = 1;
    let channels = buffer.numberOfChannels;
    this.peaks = new Float32Array(this.displayWidth);

    for (let c = 0; c < channels; c++) {
      let chan = buffer.getChannelData(c);
      for (let i = 0; i < this.displayWidth; i++) {
        let start = ~~(i * sampleSize);
        let end = start + sampleSize;
        let peak = 0;
        for (let j = start; j < end; j += this.sampleStep) {
          let value = chan[j];
          if (value > peak) peak = value; else if (-value > peak) peak = -value;
        }
        if (c > 1) this.peaks[i] += peak / channels; else this.peaks[i] = peak / channels;
      }
    }
  }
}
