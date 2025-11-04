import http from 'http';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// le serveur Node pour le sampler 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname; // Dossier du projet (sert index.html, js, css)
// Presets (JSON + audio). On prend un dossier local `presets/` si présent.
const defaultCandidate = path.resolve(__dirname, '..', '..', 'Seance2', 'ExampleRESTEndpoint', 'public', 'presets');
const candidates = [
  path.join(__dirname, 'presets'),
  path.resolve(__dirname, '..', 'presets'),
  path.resolve(process.env.HOME || '', 'Desktop', 'presets'),
  defaultCandidate
];
let PRESETS_DIR = defaultCandidate;
for (const c of candidates) {
  try {
    if (existsSync(c)) { PRESETS_DIR = c; break; }
  } catch (e) {}
}
console.log('[server] Using presets directory:', PRESETS_DIR);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

async function readAllFactoryPresets() {
  try {
    const files = (await readdir(PRESETS_DIR)).filter(f => f.endsWith('.json'));
    const stripComments = (str) => {
      let s = str.replace(/\/\*[\s\S]*?\*\//g, '');
      s = s.replace(/\/\/.*$/gm, '');
      return s;
    };
    const jsons = [];
    for (const f of files) {
      try {
        const raw = await readFile(path.join(PRESETS_DIR, f), 'utf-8');
        const cleaned = stripComments(raw);
        jsons.push(JSON.parse(cleaned));
      } catch (e) {
        console.error('[server] failed to parse preset', f, e);
      }
    }
    return jsons;
  } catch (e) {
    console.error('[server] Cannot read presets directory', PRESETS_DIR, e);
    // fallback simple
    return [];
  }
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, headers);
  res.end(body);
}

async function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  // Serve audio + JSON under /presets from PRESETS_DIR
  if (urlPath.startsWith('/presets/')) {
    // decode %20 (espaces) pour retrouver les fichiers
    const decoded = decodeURIComponent(urlPath);
    const subPath = decoded.replace('/presets/', '');
    const filePath = path.join(PRESETS_DIR, subPath);
    try {
      const ext = path.extname(filePath);
      const data = await readFile(filePath);
      const type = MIME[ext] || 'application/octet-stream';
      send(res, 200, data, { 'Content-Type': type });
      return;
    } catch (e) {
      send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
  }
  const filePath = path.join(ROOT, urlPath);
  try {
    const ext = path.extname(filePath);
    const data = await readFile(filePath);
    const type = MIME[ext] || 'application/octet-stream';
    send(res, 200, data, { 'Content-Type': type });
  } catch (e) {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/api/presets') {
    // API simple: renvoie un tableau de presets
    const presets = await readAllFactoryPresets();
    return send(res, 200, JSON.stringify(presets, null, 2), { 'Content-Type': 'application/json; charset=utf-8' });
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Sampler server on http://localhost:${PORT}`);
});
