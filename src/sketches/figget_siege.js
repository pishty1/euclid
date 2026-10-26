// Local Go-inspired encounter. Pure rules shared by UI, bot and tests.
const SIZE = 7, HUMAN = 1, BOT = 2, HUMAN_CAMP = 22, BOT_CAMP = 26, QUARRY = 24;
const signature = board => board.join('');
const label = i => `${'ABCDEFG'[i % SIZE]}${Math.floor(i / SIZE) + 1}`;
function neighbors(i) {
  const x = i % SIZE, y = Math.floor(i / SIZE), result = [];
  if(x > 0) result.push(i - 1);
  if(x < SIZE - 1) result.push(i + 1);
  if(y > 0) result.push(i - SIZE);
  if(y < SIZE - 1) result.push(i + SIZE);
  return result;
}
function group(board, start) {
  const stones = new Set(), liberties = new Set(), color = board[start];
  if(!color) return {stones: [], liberties: []};
  const pending = [start];
  while(pending.length) {
    const i = pending.pop();
    if(stones.has(i)) continue;
    stones.add(i);
    for(const n of neighbors(i)) {
      if(board[n] === 0) liberties.add(n);
      else if(board[n] === color && !stones.has(n)) pending.push(n);
    }
  }
  return {stones: [...stones], liberties: [...liberties]};
}
function fresh() {
  const board = Array(49).fill(0);
  board[HUMAN_CAMP] = HUMAN; board[BOT_CAMP] = BOT;
  return {version: 1, board, turn: HUMAN, captures: [0,0,0], history: [signature(board)],
    moves: 0, passes: 0, winner: null, last: null,
    message: 'Your turn. Place an outpost beside your camp or approach the orange bot. Numbers show group liberties.'};
}
function score(s) {
  const scores = [0, s.captures[HUMAN], s.captures[BOT]];
  s.board.forEach(color => {if(color) scores[color]++;});
  // The quarry is playable terrain: occupation is worth three extra points.
  if(s.board[QUARRY]) scores[s.board[QUARRY]] += 3;
  return scores;
}
function finish(s) {
  const scores = score(s);
  return {...s, winner: scores[1] === scores[2] ? 0 : scores[1] > scores[2] ? HUMAN : BOT,
    message: `Final score — you ${scores[1]}, bot ${scores[2]}. Outposts + captures + 3 for occupying the quarry.`};
}
function place(s, i) {
  if(s.winner !== null) return {error: 'This encounter has ended. Start a rematch or return to exploration.'};
  if(!Number.isInteger(i) || i < 0 || i >= 49 || s.board[i]) return {error: 'Choose an empty intersection.'};
  const board = s.board.slice(), player = s.turn, opponent = 3 - player;
  board[i] = player;
  let captured = [];
  for(const n of neighbors(i)) {
    if(board[n] === opponent) {
      const g = group(board,n);
      if(!g.liberties.length) {
        captured.push(...g.stones);
        g.stones.forEach(p => {board[p] = 0;});
      }
    }
  }
  if(!group(board,i).liberties.length) return {error: 'No breathing room: your group needs at least one empty orthogonal neighbor, unless this move captures first.'};
  const hash = signature(board);
  if(s.history.includes(hash)) return {error: 'Repetition rule: you cannot recreate an earlier board. Play elsewhere.'};
  const captures = s.captures.slice(); captures[player] += captured.length;
  const camp = opponent === HUMAN ? HUMAN_CAMP : BOT_CAMP;
  let next = {...s, board, captures, turn: opponent, history: [...s.history, hash],
    moves: s.moves + 1, passes: 0, last: i,
    winner: captured.includes(camp) ? player : null,
    message: `${player === HUMAN ? 'You' : 'Bot'} placed at ${label(i)}${captured.length ? ` and captured ${captured.length}` : ''}.`};
  if(next.winner !== null) next.message += player === HUMAN ? ' Bot camp captured — you win!' : ' Your camp was surrounded — the bot wins. Your explorer and supplies are safe.';
  else if(next.moves >= 80) next = finish(next);
  return {state: next};
}
function pass(s) {
  if(s.winner !== null) return s;
  const next = {...s, turn: 3-s.turn, passes: s.passes+1, moves: s.moves+1, last: null,
    message: `${s.turn === HUMAN ? 'You' : 'Bot'} passed.`};
  return next.passes >= 2 || next.moves >= 80 ? finish(next) : next;
}
function retreat(s) {
  return s.winner !== null ? s : {...s, winner: BOT, message: 'You withdrew safely. The bot holds the quarry; your exploration progress is unchanged.'};
}
function evaluate(s, player) {
  if(s.winner !== null) return s.winner === player ? 100000 : s.winner === 0 ? 0 : -100000;
  const enemy = 3-player, scores = score(s);
  let value = 8*(scores[player]-scores[enemy]);
  const visited = new Set();
  s.board.forEach((color,i) => {
    if(!color || visited.has(i)) return;
    const g = group(s.board,i);g.stones.forEach(p=>visited.add(p));
    const camp = g.stones.includes(color === HUMAN ? HUMAN_CAMP : BOT_CAMP);
    const safety = g.liberties.length === 1 ? -30*(camp?4:1) : g.liberties.length === 2 ? -8*(camp?3:1) : Math.min(g.liberties.length,6)*2;
    value += (color === player ? 1 : -1)*safety;
  });
  return value;
}
function botMove(s) {
  if(s.winner !== null || s.turn !== BOT) return s;
  let best = null, bestValue = -Infinity;
  for(let i=0;i<49;i++) {
    const result = place(s,i);
    if(!result.state) continue;
    const next = result.state;
    // Look one human response ahead. This avoids obvious camp-capture blunders.
    let worst = evaluate(next,BOT);
    if(next.winner === null) {
      for(let j=0;j<49;j++) {
        const reply = place(next,j);
        if(reply.state) worst = Math.min(worst,evaluate(reply.state,BOT));
      }
    }
    const x=i%7,y=Math.floor(i/7);
    const value = worst + evaluate(next,BOT)*.15 - (Math.abs(x-3)+Math.abs(y-3))*.1;
    if(value > bestValue) {bestValue=value;best=next;}
  }
  // Accept an end by passes if ahead, or pass when there are no legal placements.
  if(!best || (s.passes && score(s)[BOT] >= score(s)[HUMAN] && bestValue < 50000)) return pass(s);
  return best;
}
function valid(s) {
  const integer = n => Number.isInteger(n) && n >= 0;
  return !!(s && s.version===1 && Array.isArray(s.board) && s.board.length===49 && s.board.every(n=>[0,1,2].includes(n)) &&
    [1,2].includes(s.turn) && [null,0,1,2].includes(s.winner) && integer(s.moves) && s.moves<=80 && integer(s.passes) && s.passes<=2 &&
    Array.isArray(s.captures) && s.captures.length===3 && s.captures.every(integer) &&
    Array.isArray(s.history) && s.history.length>0 && s.history.length<=81 && s.history.every(h=>typeof h==='string' && /^[012]{49}$/.test(h)) &&
    s.history[s.history.length-1]===signature(s.board) && (s.last===null || (integer(s.last)&&s.last<49)) && typeof s.message==='string' &&
    (s.winner!==null || (s.board[HUMAN_CAMP]===HUMAN && s.board[BOT_CAMP]===BOT)));
}
module.exports={SIZE,HUMAN,BOT,HUMAN_CAMP,BOT_CAMP,QUARRY,neighbors,group,fresh,place,pass,retreat,score,botMove,valid,label};
