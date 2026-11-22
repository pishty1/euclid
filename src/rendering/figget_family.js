// Family records stay accessible after retirement, up to the model's archive limit.
function node(parent, tag, text) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  parent.appendChild(el);
  return el;
}
function button(parent, title, action) {
  const el = node(parent, 'button', title);
  el.type = 'button';
  el.addEventListener('click', action);
  return el;
}
function create(parent, follow) {
  const notice = node(parent, 'div');
  notice.hidden = true;
  notice.setAttribute('role', 'status');
  return {follow, notice, followed: null, highestId: 0, view: null, panel: null, births: []};
}
function reset(ui) {
  ui.notice.replaceChildren();
  ui.notice.hidden = true;
  ui.followed = null;
  ui.highestId = 0;
  ui.births = [];
  ui.view = null;
  ui.selected = null;
  if (ui.panel) { ui.panel.listKey = null; ui.panel.detailKey = null; }
}
function update(ui, view, followed) {
  if (!view) { reset(ui); return; }
  const bots = view['bots'];
  const previous = ui.births;
  let births = followed == null || ui.followed !== followed || !ui.view ? [] :
    previous.filter(id => bots.some(bot => bot['id'] === id));
  if (followed != null && followed === ui.followed && ui.view) {
    const newborns = bots.filter(bot => bot['id'] > ui.highestId && bot['family']?.['parentId'] === followed);
    births = births.concat(newborns.map(bot => bot['id']));
  }
  if (births.join() !== previous.join()) {
    ui.notice.replaceChildren();
    if (births.length) {
      node(ui.notice, 'span', 'Bot '+followed+' has new offspring.');
      for (const id of births) button(ui.notice, 'Follow offspring · Bot '+id, () => ui.follow(id));
    }
    ui.notice.hidden = !births.length;
  }
  ui.births = births;
  ui.view = view;
  ui.followed = followed;
  for (const bot of bots) ui.highestId = Math.max(ui.highestId, bot['id']);
  if (ui.panel?.root.isConnected && !ui.panel.root.closest('[hidden]')) refreshPanel(ui);
}

function comparison(parent, child) {
  const p = parent?.['family']?.['early']?.['minutes'];
  const c = child?.['family']?.['early']?.['minutes'];
  if (!p || !c) return null;
  const minutes = Math.min(5, p.length, c.length);
  if (!minutes) return {minutes};
  return {minutes, parent: p[minutes-1], child: c[minutes-1]};
}
function compareAtAge(parentEl, parent, child) {
  const result = comparison(parent, child);
  if (!result) {
    node(parentEl,'p','Early-life observations are unavailable for this pair.');
    return;
  }
  if (!result.minutes) {
    node(parentEl,'p','Both bots need to live one full simulated minute for a comparison.');
    return;
  }
  const minutes = result.minutes;
  node(parentEl,'p','Per simulated minute over their first '+minutes+(minutes === 1 ? ' minute.' : ' minutes.'));
  const table = node(parentEl,'table');
  table.setAttribute('aria-label','Parent and offspring at the same age');
  const header = node(node(table,'thead'),'tr');
  for (const title of ['Measure','Parent #'+parent['id'],'Offspring #'+child['id']])
    node(header,'th',title).scope = 'col';
  const body = node(table,'tbody');
  for (const [i, label] of ['Tiles travelled','Units gathered','Health supplied'].entries()) {
    const row = node(body,'tr');
    node(row,'th',label).scope = 'row';
    node(row,'td',(result.parent[i]/minutes).toFixed(1));
    node(row,'td',(result.child[i]/minutes).toFixed(1));
  }
}
function refreshPanel(ui) {
  const view = ui.view, panel = ui.panel;
  const records = [...view['bots'], ...(view['familyArchive'] || [])];
  const byId = new Map(records.map(bot => [bot['id'],bot]));
  if (!byId.has(ui.selected)) ui.selected = records[0]?.['id'];
  const subject = byId.get(ui.selected);
  const listKey = records.map(a => a['id']+(a['retiredAt'] != null ? 'r' : '')).join(',');
  if (panel.listKey !== listKey) {
    panel.select.replaceChildren();
    for (const bot of records) {
      const suffix = bot['retiredAt'] == null ? '' : ' · retired';
      const opt = node(panel.select,'option','Bot '+bot['id']+' · G'+bot['generation']+suffix);
      opt.value = String(bot['id']);
    }
    panel.listKey = listKey;
  }
  panel.select.value = String(ui.selected);
  if (!subject) { panel.details.replaceChildren(); return; }
  const children = records.filter(b => b['family']?.['parentId'] === ui.selected);
  const parentId = subject['family']?.['parentId'], parent = byId.get(parentId);
  const pairParent = parentId == null ? subject : parent;
  const pairChild = parentId == null ? children[0] : subject;
  const key = [ui.selected,subject['retiredAt'],parentId,!!parent,children.map(b=>b['id']).join(','),
    pairParent?.['family']?.['early']?.['minutes']?.length,pairChild?.['family']?.['early']?.['minutes']?.length].join('|');
  if (panel.detailKey === key) return;
  panel.detailKey = key;
  const details = panel.details;
  details.replaceChildren();
  const choose = id => { ui.selected = id; refreshPanel(ui); };
  if (subject['retiredAt'] == null) button(details,'Follow Bot '+ui.selected,()=>ui.follow(subject['id']));
  if (parent) button(details,'Parent · Bot '+parentId,()=>choose(parentId));
  else if (parentId != null) node(details,'p','Parent Bot '+parentId+' is outside the retained records.');
  else if (subject['generation'] > 1) node(details,'p','This bot predates parent records.');
  else node(details,'p','This bot started its own family.');
  if (children.length) {
    const group = node(details,'div');
    for (const child of children) button(group,'Offspring · Bot '+child['id'],()=>choose(child['id']));
  } else node(details,'p','No offspring in the retained records.');
  if (pairParent && pairChild) compareAtAge(details,pairParent,pairChild);
}
function render(ui, content, view, selected) {
  ui.view = view;
  if (selected != null) ui.selected = selected;
  node(content,'h2','Family records');
  node(content,'p','Choose a bot to trace its parent and offspring. Records include living bots and the most recent 256 retirements.');
  const label = node(content,'label','Family member');
  const select = node(label,'select');
  select.setAttribute('aria-label','Family member');
  const details = node(content,'div');
  details.className = 'fl-family';
  ui.panel = {root:details, select, details, listKey:null, detailKey:null};
  select.addEventListener('change',()=>{ui.selected=Number(select.value);refreshPanel(ui);});
  refreshPanel(ui);
}
module.exports = {create, update, render, reset, comparison};
