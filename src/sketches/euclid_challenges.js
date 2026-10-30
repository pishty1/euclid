// Check completed, explicitly drawn shapes against the player's reference line.
// Geometry is checked numerically; this does not certify a Euclidean proof.
const TOLERANCE = 0.02;
function check(kind, points, lines, reference) {
  const byId = new Map(points.filter(p => p['valid'] !== false).map(p => [p['id'], p['pos']]));
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const a = byId.get(reference?.[0]), b = byId.get(reference?.[1]);
  if (!a || !b || distance(a, b) < 1e-6) return false;
  const r = distance(a, b), near = (x, y) => Math.abs(x - y) <= y * TOLERANCE;
  const graph = new Map();
  for (const line of lines) {
    if (line['a'] === line['b'] || !byId.has(line['a']) || !byId.has(line['b'])) continue;
    if (!graph.has(line['a'])) graph.set(line['a'], new Set());
    if (!graph.has(line['b'])) graph.set(line['b'], new Set());
    graph.get(line['a']).add(line['b']); graph.get(line['b']).add(line['a']);
    if (kind === 'double' && near(distance(byId.get(line['a']), byId.get(line['b'])), 2 * r)) return true;
  }
  if (kind === 'double') return false;
  const vertices = kind === 'triangle' ? 3 : 4;
  if (!['triangle', 'square', 'double-square'].includes(kind)) return false;
  const side = kind === 'double-square' ? Math.SQRT2 * r : r;
  function validCycle(ids) {
    const p = ids.map(id => byId.get(id));
    for (let i = 0; i < p.length; i++) if (!near(distance(p[i], p[(i + 1) % p.length]), side)) return false;
    if (vertices === 3) return true;
    // Both diagonals must match, excluding rhombi and self-crossing loops.
    return near(distance(p[0], p[2]), side * Math.SQRT2) && near(distance(p[1], p[3]), side * Math.SQRT2);
  }
  function search(path) {
    const neighbours = graph.get(path[path.length - 1]);
    if (!neighbours) return false;
    if (path.length === vertices) return neighbours.has(path[0]) && validCycle(path);
    for (const next of neighbours) if (!path.includes(next) && search([...path, next])) return true;
    return false;
  }
  for (const id of graph.keys()) if (search([id])) return true;
  return false;
}
module.exports = {check};
