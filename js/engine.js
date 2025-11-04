// Petit moteur audio: charge et joue des buffers
export default class SamplerEngine {
  constructor() {
    this.ctx = new AudioContext(); // un seul contexte pour tout
  }

  async load(urls) {
    const promises = urls.map(u => this._loadOne(u).catch(e => ({ error: e })));
    const results = await Promise.all(promises);
    return results;
  }

  async loadWithProgress(urls, progressCb) {
    // Version avec progression (pour les barres)
    const tasks = urls.map((u, i) => this._loadOneWithProgress(u, (loaded, total) => progressCb && progressCb(i, loaded, total))
      .then(buf => buf)
      .catch(error => ({ error })));
    const results = await Promise.allSettled(tasks);
    // normalisation du format de sortie
    return results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason || new Error('failed') });
  }

  async _loadOne(url) {
    const r = await fetch(url);
    const ab = await r.arrayBuffer();
    const buf = await this._decodeAudioData(ab);
    return buf;
  }

  async _loadOneWithProgress(url, onProgress) {
    // Lecture en streaming pour suivre chargé/total
    const r = await fetch(url);
    if (!r.ok) throw new Error('http ' + r.status);
    const total = Number(r.headers.get('Content-Length')) || 0;
    if (!r.body || !r.body.getReader) {
      // fallback no-stream
      const ab = await r.arrayBuffer();
      onProgress && onProgress(total || ab.byteLength, total || ab.byteLength);
      return await this.ctx.decodeAudioData(ab);
    }
    const reader = r.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onProgress && onProgress(loaded, total);
    }
    // concat
    let size = 0; chunks.forEach(c => size += c.byteLength);
    const merged = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.byteLength; }
    const buf = await this._decodeAudioData(merged.buffer);
    return buf;
  }

  // Décodage via Promise; repli en mode callbacks si nécessaire
  _decodeAudioData(arrayBuffer) {
    // Compat: Promise ou callbacks selon le navigateur
    const ctx = this.ctx;
    // Les navigateurs récents renvoient une Promise depuis decodeAudioData
    try {
      const possible = ctx.decodeAudioData(arrayBuffer);
      if (possible && typeof possible.then === 'function') return possible;
    } catch (e) {
    }
    return new Promise((resolve, reject) => {
      // Certaines implémentations plus anciennes exigent des callbacks succès/erreur
      try {
        ctx.decodeAudioData(arrayBuffer, (decoded) => resolve(decoded), (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  play(buffer, startTime, endTime) {
    // Joue [startTime, endTime] si dispo
    if (!buffer) return;
    if (startTime < 0) startTime = 0;
    if (endTime > buffer.duration) endTime = buffer.duration;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);
    const dur = Math.max(0, (endTime - startTime));
    src.start(0, startTime, dur || buffer.duration);
  }
}
