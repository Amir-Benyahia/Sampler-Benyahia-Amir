// Fichier front principal: charge les presets et gère l'UI
import SamplerEngine from './engine.js';
import SamplerGUI from './gui.js';

const defaultURLs = [
  'https://upload.wikimedia.org/wikipedia/commons/a/a3/Hardstyle_kick.wav',
  'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Redoblante_de_marcha.ogg/Redoblante_de_marcha.ogg.mp3',
  'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c9/Hi-Hat_Cerrado.ogg/Hi-Hat_Cerrado.ogg.mp3'
];

const padsEl = document.querySelector('#pads');
const presetSelect = document.querySelector('#presetSelect');
const loadAllBtn = document.querySelector('#loadAll');
const playBtn = document.querySelector('#play');
const stopAllBtn = document.querySelector('#stopAll');
const canvas = document.querySelector('#wave');
const overlay = document.querySelector('#overlay');

const engine = new SamplerEngine();         // moteur audio
const gui = new SamplerGUI(canvas, overlay); // dessin + trims

let buffers = [];
let currentIdx = -1;
let trimState = [];
let padToSample = [];
let sampleToPad = [];
let currentInfos = [];

function sampleInfosFromPreset(preset) {
  // Transforme un preset en liste simple {url,name}
  const origin = window.location.origin;
  const presetsBase = `${origin}/presets/`;
  const arr = Array.isArray(preset?.samples) ? preset.samples : [];
  const normalized = arr.map(s => {
    if (!s) return null;
    if (typeof s === 'string') return { url: s, name: '' };
    if (typeof s === 'object') return { url: s.url || s.path || s.file || '', name: s.name || s.label || '' };
    return null;
  }).filter(Boolean);
  return normalized.map(({ url, name }) => {
    try {
      // URL absolue si possible
      return { url: new URL(url, presetsBase).toString(), name: name || '' };
    } catch {
      // sinon on enlève "./" et on préfixe
      const cleanUrl = String(url).replace(/^\.\//, '');
      return { url: presetsBase + cleanUrl, name: name || '' };
    }
  }).filter(x => x && x.url);
}

async function fetchPresets() {
  // Appelle /api/presets (backend). En cas d'erreur: 3 sons par défaut
  try {
    const r = await fetch(window.location.origin + '/api/presets');
    if (!r.ok) throw new Error('http ' + r.status);
    const presets = await r.json();
    presetSelect.innerHTML = '';
    presets.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p?.name || `Preset ${i+1}`;
      presetSelect.appendChild(opt);
    });
    if (presets.length > 0) presetSelect.selectedIndex = 0;
    console.log('[main] fetched presets', presets);
    return presets;
  } catch (e) {
    console.warn('[main] could not fetch presets, using defaults', e);
    presetSelect.innerHTML = '<option>Defaults</option>';
    return [];
  }
}

function mapSamplesToPads(n) {
  // Place les samples sur la grille 4x4 
  padToSample = Array(16).fill(-1);
  sampleToPad = Array(n).fill(-1);
  for (let k = 0; k < Math.min(n, 16); k++) {
    const rowFromBottom = Math.floor(k / 4);
    const col = k % 4;
    const row = 3 - rowFromBottom;
    const padIndex = row * 4 + col;
    padToSample[padIndex] = k;
    sampleToPad[k] = padIndex;
  }
}

function renderPads(infos) {
  // Construit les pads et branche les boutons
  currentInfos = infos;
  mapSamplesToPads(infos.length);
  padsEl.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const sampleIndex = padToSample[i];
    const pad = document.createElement('div');
    pad.className = 'pad';
    const btn = document.createElement('button');
    const label = sampleIndex !== -1 && currentInfos[sampleIndex]?.name ? currentInfos[sampleIndex].name : `Pad ${i+1}`;
    btn.textContent = label;
    btn.disabled = (sampleIndex === -1);
    const barWrap = document.createElement('div');
    barWrap.className = 'progress';
    const bar = document.createElement('div');
    bar.className = 'bar';
    barWrap.appendChild(bar);
    pad.appendChild(btn);
    pad.appendChild(barWrap);
    padsEl.appendChild(pad);
    if (sampleIndex !== -1) {
      btn.onclick = () => {
        if (!buffers[sampleIndex] || buffers[sampleIndex].error) return;
        if (currentIdx >= 0 && buffers[currentIdx] && !buffers[currentIdx].error) {
          trimState[currentIdx] = gui.getTrimPixels();
        }
        currentIdx = sampleIndex;
        Array.from(padsEl.children).forEach(e => e.classList.remove('selected'));
        pad.classList.add('selected');
        gui.setBuffer(buffers[sampleIndex]);
        if (trimState[sampleIndex]) {
          gui.setTrimPixels(trimState[sampleIndex].left, trimState[sampleIndex].right);
        }
        const { start, end } = gui.getSelectionSec();
        engine.play(buffers[sampleIndex], start, end || buffers[sampleIndex].duration);
      };
      pad.dataset.sampleIndex = String(sampleIndex);
    }
  }
}

async function loadAll(urls) {
  // Télécharge tout + MAJ barres de progression
  trimState = urls.map(() => ({ left: Math.round((canvas.width||640)*0.08), right: Math.round((canvas.width||640)*0.5) }));
  const pads = padsEl.querySelectorAll('.pad');
  pads.forEach(p => {
    const s = Number(p.dataset.sampleIndex);
    if (!Number.isNaN(s) && s >= 0) {
      p.classList.add('loading');
      const btn = p.querySelector('button');
      if (btn) btn.disabled = true;
      const bar = p.querySelector('.bar');
      if (bar) bar.style.width = '0%';
    }
  });
  buffers = await engine.loadWithProgress(urls, (i, loaded, total) => {
    const pi = sampleToPad[i];
    const pad = padsEl.children[pi];
    if (!pad) return;
    const bar = pad.querySelector('.bar');
    if (bar) {
      if (total > 0) bar.style.width = Math.min(100, Math.round(loaded*100/total)) + '%';
      else bar.style.width = '100%';
    }
  });
  for (let s = 0; s < urls.length; s++) {
    const padIndex = sampleToPad[s];
    const pad = padsEl.children[padIndex];
    if (!pad) continue;
    pad.classList.remove('loading');
    const btn = pad.querySelector('button');
    if (buffers[s] && !buffers[s].error) {
      pad.classList.add('loaded');
      if (btn) btn.disabled = false;
    } else {
      pad.classList.add('failed');
      if (btn) btn.disabled = true;
    }
  }
  const idx = buffers.findIndex(b => b && !b.error);
  if (idx >= 0) {
    currentIdx = idx;
    gui.setBuffer(buffers[idx]);
    const pi = sampleToPad[idx];
    const pad = padsEl.children[pi];
    if (pad) pad.classList.add('selected');
  }
  try {
    console.table(urls.map((u,i) => ({
      index: i,
      url: u,
      ok: Boolean(buffers[i] && !buffers[i].error),
      error: buffers[i]?.error?.message || ''
    })));
  } catch {}
}

window.onload = async function init() {
  // Démarrage: fetch presets, rendu, chargement
  const presets = await fetchPresets();
  let infos = defaultURLs.map(u => ({ url: u, name: '' }));
  if (presets.length > 0) {
    infos = sampleInfosFromPreset(presets[0]);
    if (!infos.length) infos = defaultURLs.map(u => ({ url: u, name: '' }));
    presetSelect.onchange = async () => {
      const p = presets[Number(presetSelect.value)];
      let i = sampleInfosFromPreset(p);
      if (!i.length) i = defaultURLs.map(u => ({ url: u, name: '' }));
      renderPads(i);
      await loadAll(i.map(x => x.url));
    };
  }
  renderPads(infos);
  loadAllBtn.onclick = async () => await loadAll((currentInfos.length ? currentInfos : infos).map(x => x.url));
  playBtn.onclick = () => {
    if (currentIdx < 0) return;
    const buf = buffers[currentIdx];
    if (!buf || buf.error) return;
    const { start, end } = gui.getSelectionSec();
    engine.play(buf, start, end || buf.duration);
  };
  if (stopAllBtn) stopAllBtn.onclick = () => engine.ctx.suspend().then(() => engine.ctx.resume());
  await loadAll(infos.map(x => x.url));
};
