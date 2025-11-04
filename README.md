# Sampler — Benyahia Amir

But du projet
- Réaliser un sampler Web Audio complet:
  - Grille de 16 pads (4×4), chargement et lecture de samples.
  - Affichage de la waveform et sélection d’une portion via 2 trimbars.
  - “Load All” avec barres de progression par sample.
  - Backend Node exposant les presets et servant les assets audio.

Fonctionnalités actuelles
- UI 4×4:
  - Pads générés dynamiquement, mapping bas→haut, gauche→droite.
  - Sélection visuelle du pad courant et restitution des trims mémorisés par sample.
- Waveform + trims:
  - Dessin dans un canvas, overlay pour les trimbars, drag à la souris et au touch.
  - Lecture de la portion sélectionnée.
- Chargement:
  - “Load All” lance des fetch en parallèle, progression par pad, tolère les erreurs individuelles.
  - Première sélection auto sur le premier buffer chargé avec succès.
- Backend:
  - GET `/api/presets` retourne la liste des presets.
  - Routage `/presets/...` vers les fichiers audio + JSON locaux (espaces pris en charge).
  - Lecture des presets JSON même s’ils contiennent des commentaires (compat contenu de cours).

Architecture (fichiers)
- Front
  - Page: [index.html](index.html)
  - Orchestration UI/API: [js/main.js](js/main.js)
  - Moteur audio: [`SamplerEngine`](js/engine.js)
  - GUI waveform + trims: [`SamplerGUI`](js/gui.js), [`WaveformDrawer`](js/waveformdrawer.js), [`TrimbarsDrawer`](js/trimbarsdrawer.js)
  - Utilitaires: [js/utils.js](js/utils.js)
  - Styles: [css/styles.css](css/styles.css)
- Backend
  - Serveur Node: [server.mjs](server.mjs)
  - Lecture des presets: [`readAllFactoryPresets`](server.mjs)
- Données
  - Presets + assets: dossier [presets/](presets/) (ex: [presets/808.json](presets/808.json), [presets/hip-hop.json](presets/hip-hop.json), etc.)

Flux de données 
1. Au chargement, le front appelle `/api/presets` via [js/main.js](js/main.js) et remplit le menu.
2. L’utilisateur choisit un preset → [`sampleInfosFromPreset`](js/main.js) normalise les URLs relatives en URLs absolues sous `/presets/...`.
3. “Load All” → [`SamplerEngine.loadWithProgress`](js/engine.js) télécharge et décode tous les sons en parallèle, envoie la progression par sample pour animer les barres des pads.
4. Clic sur un pad → [`SamplerGUI`](js/gui.js) affiche la waveform; la portion $[start,end]$ vient des trimbars et est jouée par [`SamplerEngine.play`](js/engine.js).

Techniques utilisées
- Web Audio API:
  - Décodage via `AudioContext.decodeAudioData` avec fallback callback (compat navigateurs).
  - Lecture d’une sous‑portion du buffer via `AudioBufferSourceNode.start(offset, duration)`.
- Promises et parallélisation:
  - Chargement parallèle des ressources audio.
  - `Promise.allSettled` pour ne pas casser au premier échec et produire un état par sample.
- Fetch streaming + progression:
  - Suivi de `loaded/total` avec `ReadableStream.getReader()` et `Content-Length`.
- Normalisation des chemins:
  - Construction d’URLs absolues avec `new URL(rel, base)`; fallback en préfixant `/presets/`.
  - `decodeURIComponent` côté serveur pour gérer les noms de fichiers avec espaces.


Comment exécuter
1. Démarrer le serveur:
   - `node server.mjs`
2. Ouvrir: `http://localhost:4000`
3. Choisir un preset, cliquer “Load All”, puis “Play selection” après avoir ajusté les trims.
