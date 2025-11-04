// utilitaires simples
function distance(x1, y1, x2, y2) {
  // distance 2D basique
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function pixelToSeconds(x, bufferDuration, canvasWidth) {
  // convertit une position x en secondes
  let result = x * bufferDuration / canvasWidth;
  return result;
}

export { distance, pixelToSeconds };
