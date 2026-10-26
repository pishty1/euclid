const {test}=require('node:test');
const assert=require('node:assert/strict');
const g=require('../../src/sketches/figget_siege.js');
function position(stones,turn=1){const s=g.fresh();s.board.fill(0);for(const [i,c] of stones)s.board[i]=c;s.history=[s.board.join('')];s.turn=turn;return s;}
test('initial camps have four liberties; diagonal outposts do not connect',()=>{
  const s=g.fresh();assert.ok(g.valid(s));assert.equal(g.group(s.board,g.HUMAN_CAMP).liberties.length,4);
  s.board[14]=1;assert.equal(g.group(s.board,g.HUMAN_CAMP).stones.length,1);
  assert.equal(g.neighbors(0).length,2);
});
test('surrounding captures a group; capturing camp wins without mutating input',()=>{
  const s=position([[26,2],[19,1],[25,1],[27,1],[22,1]]);const original=JSON.stringify(s);
  const next=g.place(s,33).state;
  assert.equal(next.board[26],0);assert.equal(next.captures[1],1);assert.equal(next.winner,1);
  assert.equal(JSON.stringify(s),original);assert.ok(g.place(next,0).error);
});
test('connected stones share liberties and are captured together',()=>{
  const s=position([[8,2],[9,2],[1,1],[2,1],[7,1],[10,1],[15,1]]);
  assert.deepEqual(g.group(s.board,8).liberties,[16]);
  const next=g.place(s,16).state;assert.equal(next.captures[1],2);assert.equal(next.board[8],0);assert.equal(next.board[9],0);
});
test('reject occupied, off-board and suicidal moves without consuming a turn',()=>{
  const s=position([[1,2],[7,2],[9,2],[15,2]]);
  assert.ok(g.place(s,8).error);assert.ok(g.place(s,1).error);assert.ok(g.place(s,-1).error);assert.ok(g.place(s,49).error);
  assert.equal(s.moves,0);
});
test('capture before suicide check allows a surrounded capturing placement',()=>{
  const s=position([[1,2],[7,2],[2,1],[8,1],[14,1]]);
  const next=g.place(s,0).state;assert.ok(next);assert.equal(next.captures[1],2);
});
test('positional superko rejects a board that appeared earlier',()=>{
  const s=g.fresh();const next=g.place(s,0).state;s.history.unshift(next.board.join(''));
  assert.match(g.place(s,0).error,/Repetition/);
});
test('two passes end by score; quarry occupation adds three bonus points',()=>{
  let s=g.fresh();s.board[24]=1;s.history=[s.board.join('')];
  assert.equal(g.score(s)[1],5);s=g.pass(g.pass(s));assert.equal(s.winner,1);
  assert.equal(g.retreat(g.fresh()).winner,2);
});
test('bot takes an immediate camp capture and respects turn ownership',()=>{
  const s=position([[22,1],[15,2],[21,2],[23,2],[26,2]],2);
  const next=g.botMove(s);assert.equal(next.winner,2);assert.equal(next.board[22],0);
  const human=g.fresh();assert.equal(g.botMove(human),human);
});
test('bot defends a threatened camp when a safe extension exists',()=>{
  const s=position([[26,2],[19,1],[25,1],[27,1],[22,1]],2);
  const next=g.botMove(s);
  assert.ok(g.group(next.board,26).liberties.length>1);
  for(let i=0;i<49;i++)assert.notEqual(g.place(next,i).state?.winner,1);
});
test('bot responds legally, saves roundtrip, bounded game eventually ends',()=>{
  let s=g.fresh();
  for(let n=0;n<80&&s.winner===null;n++){
    if(s.turn===2)s=g.botMove(s);
    else {const choices=s.board.map((_,i)=>g.place(s,i)).filter(r=>r.state);s=choices.length?choices[(n*7)%choices.length].state:g.pass(s);}
    assert.ok(g.valid(JSON.parse(JSON.stringify(s))));
  }
  assert.notEqual(s.winner,null);
  assert.ok(!g.valid({...g.fresh(),board:[1]}));assert.ok(!g.valid({...g.fresh(),history:[]}));
});
