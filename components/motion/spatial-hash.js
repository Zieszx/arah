/**
 * Bucket particles into a grid so link lookups only consider the 9 cells
 * around a point instead of every other particle.
 */
export function buildHash(particles, cellSize) {
  const hash = new Map();
  for (const p of particles) {
    const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
    let bucket = hash.get(key);
    if (!bucket) hash.set(key, (bucket = []));
    bucket.push(p);
  }
  return hash;
}

export function neighbours(hash, p, cellSize) {
  const cx = Math.floor(p.x / cellSize);
  const cy = Math.floor(p.y / cellSize);
  const out = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = hash.get(`${cx + dx},${cy + dy}`);
      if (bucket) for (const q of bucket) if (q !== p) out.push(q);
    }
  }
  return out;
}
