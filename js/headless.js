import SamplerEngine from './engine.js';

const engine = new SamplerEngine();
const urls = [
  'https://upload.wikimedia.org/wikipedia/commons/a/a3/Hardstyle_kick.wav'
];

(async () => {
  const [buf] = await engine.load(urls);
  if (buf && !buf.error) {
    engine.play(buf, 0, 0.5);
  }
})();
