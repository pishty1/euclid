const rules = require('./figget_siege.js');
const SAVE = 'figget-siege-v1';
let match, dialog, board, status, message, storage, passButton, inspect, timer, cells = [], stored = '';
const css = `
#figget-siege{box-sizing:border-box;width:min(570px,calc(100vw - 20px));max-height:calc(100dvh - 20px);overflow:auto;padding:20px;background:#10262a;color:#e1efe5;border:1px solid #71978b;border-radius:16px;font:13px/1.45 system-ui;box-shadow:0 20px 100px #0009}
#figget-siege::backdrop{background:#020c12df}#figget-siege *{box-sizing:border-box}#figget-siege h2{margin:0 0 6px;font-size:21px}#figget-siege p{margin:8px 0}#figget-siege .eyebrow{font-size:10px;letter-spacing:.16em;color:#91c8b6}
#figget-siege button{font:inherit;color:#e1efe5;background:#24454a;border:1px solid #658c80;border-radius:7px;cursor:pointer;padding:8px 12px;touch-action:manipulation}#figget-siege button:focus-visible{outline:3px solid #fff;outline-offset:1px}#figget-siege button:disabled{opacity:.5;cursor:default}
#figget-siege .siege-board{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:12px auto;width:min(100%,350px)}
#figget-siege .siege-cell{position:relative;aspect-ratio:1;padding:0;border-radius:6px;background:#193c3c;border-color:#40605b;font-size:15px;font-weight:700;min-width:0}
#figget-siege .siege-cell.human{background:#acd9c0;color:#102f25;border-color:#c9ffe0;border-radius:50%}#figget-siege .siege-cell.bot{background:#d69065;color:#341b10;border-color:#ffc293;border-radius:50%}
#figget-siege .siege-cell.camp{border-width:3px}#figget-siege .siege-cell.quarry{box-shadow:inset 0 0 0 2px #e5c269}#figget-siege .siege-cell.last{outline:2px solid #f5df9a;outline-offset:1px}
#figget-siege .siege-cell.liberty{background:#50776c;box-shadow:inset 0 0 0 2px #d0e6ae}#figget-siege .siege-cell.selected-group{outline:2px solid white}#figget-siege .siege-cell.threat{color:#9e1414}#figget-siege .siege-cell small{position:absolute;font-size:8px;bottom:1px;left:0;right:0;font-weight:500}
#figget-siege .siege-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}#figget-siege .siege-message{min-height:40px;color:#f1d6a6}#figget-siege .siege-inspect{font-size:12px;color:#adcabc;min-height:18px}#figget-siege details{margin-top:10px}#figget-siege .storage{display:block;color:#a2b9af;font-size:11px;margin-top:10px}
@media(max-height:650px){#figget-siege{padding:12px}#figget-siege .siege-board{width:260px;margin:8px auto}#figget-siege h2{font-size:17px}#figget-siege .siege-message{min-height:0}}
`;
function el(tag,text,parent,className) {
  const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;if(parent)parent.appendChild(node);return node;
}
function save() {
  try {localStorage.setItem(SAVE,JSON.stringify(match));stored='Encounter saved on this device.';}
  catch(_) {stored='Storage unavailable: this encounter is saved only for this session.';}
}
function describe(i) {
  const color=match.board[i];const site=i===rules.HUMAN_CAMP?' · your camp':i===rules.BOT_CAMP?' · bot camp':i===rules.QUARRY?' · quarry (+3 points)':'';
  return `${rules.label(i)}${site} · ${color===1?'your outpost':color===2?'bot outpost':'empty'}${color?` · ${rules.group(match.board,i).liberties.length} liberties`:''}`;
}
function highlight(i) {
  cells.forEach(c=>c.classList.remove('liberty','selected-group'));
  inspect.textContent=describe(i);
  if(match.board[i]) {
    const g=rules.group(match.board,i);
    g.stones.forEach(p=>cells[p].classList.add('selected-group'));
    g.liberties.forEach(p=>cells[p].classList.add('liberty'));
  }
}
function render() {
  const scores=rules.score(match), ended=match.winner!==null;
  status.textContent=`${ended?(match.winner===1?'You win':match.winner===2?'Bot wins':'Draw'):match.turn===1?'Your turn':'Bot is thinking…'} · ${match.moves}/80 actions · Score ${scores[1]} : ${scores[2]} · Captures ${match.captures[1]} : ${match.captures[2]}`;
  message.textContent=match.message;
  storage.textContent=stored;
  passButton.disabled=ended||match.turn!==1;
  cells.forEach((cell,i)=>{
    const color=match.board[i];cell.className=`siege-cell ${color===1?'human':color===2?'bot':''}${i===rules.HUMAN_CAMP||i===rules.BOT_CAMP?' camp':''}${i===rules.QUARRY?' quarry':''}${match.last===i?' last':''}`;
    const liberties=color?rules.group(match.board,i).liberties.length:0;
    cell.replaceChildren();if(color)cell.appendChild(document.createTextNode(String(liberties)));
    if(liberties===1)cell.classList.add('threat');
    const badge=i===rules.HUMAN_CAMP?'YOU':i===rules.BOT_CAMP?'BOT':i===rules.QUARRY?'ORE':'';
    if(badge)el('small',badge,cell);
    cell.setAttribute('aria-label',describe(i));
    // Occupied cells remain focusable for liberty inspection.
    cell.setAttribute('aria-disabled',String(ended||match.turn!==1));
  });
  inspect.textContent='Select an occupied outpost to highlight its group and breathing room.';
}
function scheduleBot() {
  clearTimeout(timer);
  if(!dialog.open||match.turn!==2||match.winner!==null)return;
  timer=setTimeout(()=>{
    const previous=match.message;
    match=rules.botMove(match);
    match={...match,message:`${previous} ${match.message}`};
    save();render();
  },200);
}
function play(i) {
  if(match.board[i]){highlight(i);return;}
  if(match.turn!==1||match.winner!==null)return;
  const result=rules.place(match,i);
  if(result.error){message.textContent=result.error;return;}
  match=result.state;save();render();scheduleBot();
}
function close() {clearTimeout(timer);dialog.close();}
function create() {
  el('style',css,document.head);
  dialog=el('dialog',null,document.body);dialog.id='figget-siege';dialog.setAttribute('aria-labelledby','siege-title');
  el('p','FIGGET-A-BALLS / LOCAL BOT ENCOUNTER',dialog,'eyebrow');
  el('h2','The contested quarry',dialog).id='siege-title';
  el('p','You are mint. The bot is orange. Surround its camp to win; protect yours. Each empty orthogonal neighbor is a liberty.',dialog);
  status=el('p','',dialog);message=el('p','',dialog,'siege-message');message.setAttribute('aria-live','polite');
  board=el('div','',dialog,'siege-board');board.setAttribute('role','group');board.setAttribute('aria-label','Seven by seven quarry board');
  for(let i=0;i<49;i++){
    const cell=el('button','',board,'siege-cell');cell.type='button';cell.onclick=()=>play(i);cell.onfocus=()=>highlight(i);cell.onmouseenter=()=>highlight(i);
    cell.addEventListener('keydown',event=>{
      const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
      if(delta!==undefined){event.preventDefault();const next=i+delta;if(next>=0&&next<49&&(Math.abs(delta)===7||Math.floor(next/7)===Math.floor(i/7)))cells[next].focus();}
    });cells.push(cell);
  }
  inspect=el('p','',dialog,'siege-inspect');
  const actions=el('div','',dialog,'siege-actions');
  passButton=el('button','Pass turn',actions);passButton.type='button';passButton.onclick=()=>{
    if(match.turn!==1||match.winner!==null)return;
    match=rules.pass(match);save();render();scheduleBot();
  };
  const pause=el('button','Back to exploration',actions);pause.type='button';pause.onclick=close;
  const withdraw=el('button','Retreat safely',actions);withdraw.type='button';withdraw.onclick=()=>{
    if(match.winner===null&&!window.confirm('Concede the quarry to the bot? Your explorer keeps all progress.'))return;
    clearTimeout(timer);match=rules.retreat(match);save();render();close();
  };
  const restart=el('button','Rematch',actions);restart.type='button';restart.onclick=()=>{
    if(match.winner===null&&!window.confirm('Replace the current encounter with a fresh match?'))return;
    clearTimeout(timer);match=rules.fresh();save();render();
  };
  const details=el('details','',dialog);el('summary','Rules & scoring',details);
  el('p','Place one outpost anywhere empty, then the bot replies. Only horizontal and vertical neighbors connect. A group at zero liberties is removed. Captures happen before checking your own liberties. Suicide and repeating any earlier board are illegal.',details);
  el('p','Capture the marked enemy camp to win immediately. Otherwise, two consecutive passes or 80 total actions end the match: each surviving outpost and captured outpost earns 1 point; occupying the gold quarry earns 3 extra. This is a Go-inspired variant, not standard Go territory scoring.',details);
  el('p','Numbers are shared group liberties, not health. Red 1 means one liberty remains. Select a stone to highlight those empty spaces. This is one local automated opponent, not another online player. The encounter uses no exploration energy and grants no world resources yet.',details);
  el('p','Back to exploration (or Escape) pauses the encounter. Retreat concedes it. Neither action kills your explorer or loses supplies.',details);
  storage=el('small','',dialog,'storage');
  dialog.addEventListener('close',()=>clearTimeout(timer));
  // Keep canvas/Quil keyboard and pointer handlers out of the modal encounter.
  ['keydown','keyup','keypress','click','mousedown','mouseup','touchstart','touchend'].forEach(type=>dialog.addEventListener(type,event=>event.stopPropagation()));
}
function open() {
  if(!dialog) {
    create();match=rules.fresh();
    try {
      const raw=localStorage.getItem(SAVE);
      if(raw){const saved=JSON.parse(raw);if(rules.valid(saved)){match=saved;stored='Resumed saved encounter.';}else stored='Invalid encounter save ignored; starting fresh.';}
    }catch(_){stored='Could not read encounter save; starting fresh.';}
  }
  if(!dialog.open)dialog.showModal();
  render();scheduleBot();
}
module.exports={open};
