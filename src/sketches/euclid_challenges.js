// Use explicitly drawn edges and compare lengths with the player's reference.
const tolerance = 0.02;
const near = (value, target) => Math.abs(value - target) <= target * tolerance;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function assess(kind, points, lines, reference) {
  const positions = new Map(points.filter(p => p['valid'] !== false).map(p => [p['id'], p['pos']]));
  const a = positions.get(reference?.[0]), b = positions.get(reference?.[1]);
  const report = (message, vertices = [], highlights = [], passed = false) =>
    ({'message': message, 'vertices': vertices, 'highlights': highlights, 'passed': passed});
  if (!a || !b || distance(a, b) < 1e-6) return report('Draw a reference segment with two distinct endpoints.');
  const r = distance(a, b);
  const length = (i, j) => distance(positions.get(i), positions.get(j));
  const graph = new Map();
  const success = 'Target reached! Your construction matches within 2%.';
  for (const line of lines) {
    const i = line['a'], j = line['b'];
    if (i === j || !positions.has(i) || !positions.has(j)) continue;
    if (!graph.has(i)) graph.set(i, new Set());
    if (!graph.has(j)) graph.set(j, new Set());
    graph.get(i).add(j);
    graph.get(j).add(i);
    if (kind === 'double' && near(length(i,j), 2*r)) return report(success, [i,j], [], true);
  }
  if (kind === 'double') return report('Draw a ruler segment twice the reference length.');
  const square = kind === 'square' || kind === 'double-square';
  if (!square && kind !== 'triangle') return report('Unknown target.');
  const count = square ? 4 : 3;
  const target = kind === 'double-square' ? r*Math.SQRT2 : r;
  const targetLabel = kind === 'double-square' ? '√2r' : 'r';
  let best = report(square ? 'Connect four corners with Ruler, then check the outline.' : 'Draw three connected sides of length r.');
  let bestRank = 0;

  function examine(path) {
    const first = path[0], last = path[count-1];
    const closed = graph.get(last).has(first);
    const edges = path.map((id, i) => [id, path[(i+1)%count]]);
    const wrong = edges.filter(([i,j]) => !near(length(i,j), target));
    if (!closed) {
      if (square && !wrong.length && bestRank < 3) {
        best = report('Three sides are drawn. Join the two highlighted endpoints to close the square.', [first,last]);
        bestRank = 3;
      }
      return;
    }
    if (wrong.length) {
      const rank = 1 + (count-wrong.length)/count;
      if (square && rank > bestRank) {
        best = report('Check the highlighted sides. Each should measure '+targetLabel+'.', [], wrong);
        bestRank = rank;
      }
      return;
    }
    if (square) {
      const diagonals = [[first,path[2]], [path[1],last]];
      if (!diagonals.every(([i,j]) => near(length(i,j), target*Math.SQRT2))) {
        if (bestRank < 4) {
          const lengths = diagonals.map(([i,j]) => (length(i,j)/r).toFixed(2)+'r');
          best = report('All four sides match. The highlighted diagonals measure '+lengths.join(' and ')+'. Aim for '+(kind==='square'?'√2r':'2r')+' each.', [], diagonals);
          bestRank = 4;
        }
        return;
      }
    }
    return report(success, path, square ? edges : [], true);
  }
  function search(path) {
    if (path.length === count) return examine(path);
    for (const next of graph.get(path[path.length-1])) {
      if (path.includes(next)) continue;
      const found = search([...path,next]);
      if (found) return found;
    }
  }
  for (const id of graph.keys()) {
    const found = search([id]);
    if (found) return found;
  }
  return best;
}

function check(kind, points, lines, reference) {
  return assess(kind, points, lines, reference)['passed'];
}
module.exports = {assess, check};
