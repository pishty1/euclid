const {SIZE} = require('./figget_life_model.js');

// A tile may host several depots over the life of the world.
function renderDepotLog(parent, view, x, y) {
  const sites = view['depotLogs']?.[y * SIZE + x];
  if (!sites?.length) return;

  const section = document.createElement('section');
  section.className = 'fl-depot-log';
  const heading = document.createElement('h3');
  heading.textContent = 'Depot visitor log';
  section.appendChild(heading);
  parent.appendChild(section);

  for (const site of sites) {
    if (site['retired'] || sites.length > 1) {
      const label = document.createElement('strong');
      label.textContent = site['retired'] ? 'Former depot' : 'Current depot';
      if (site['builtAt'] >= 0) label.textContent += ' · built at '+Math.floor(site['builtAt']/60)+'m '+Math.floor(site['builtAt']%60)+'s';
      section.appendChild(label);
    }
    const visits = site['visits'];
    if (!visits.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No visits recorded yet.';
      section.appendChild(empty);
      continue;
    }
    const list = document.createElement('ol');
    list.setAttribute('aria-label','Most recent visits first');
    for (let i=visits.length-1;i>=0;i--) {
      const e = visits[i], who = e['actor'] === 0 ? 'You' : 'Bot '+e['actor'];
      const seconds = Math.max(0,Math.floor(view['time']-e['time']));
      const age = seconds < 60 ? seconds+'s ago' : Math.floor(seconds/60)+'m ago';
      const row = document.createElement('li');
      if (e['type']==='meal') {
        const tiles = Math.abs(e['x']-x)+Math.abs(e['y']-y);
        row.textContent = who+' ate at '+e['x']+', '+e['y']+' and recovered '+Math.round(e['health'])+' health · '+tiles+' '+(tiles===1?'tile':'tiles')+' from here · '+age;
      } else {
        row.textContent = who+(e['type']==='withdraw'?' took ':' stored ')+e['amount']+' '+e['kind']+' · '+age;
      }
      list.appendChild(row);
    }
    section.appendChild(list);
  }
}
module.exports = {renderDepotLog};
