const workerSource = require('./figget_worker_source.js');

function createExperiment(requestSnapshot) {
  const element = document.createElement('details');
  element.className = 'fl-experiment';

  function append(parent, tag, text) {
    const node = document.createElement(tag);
    parent.appendChild(node);
    if (text) node.textContent = text;
    return node;
  }
  append(element, 'summary', 'Paired experiment');
  append(element, 'p', 'Compare two copies of your current world. Both start with the same bots, supplies and random seed. Choose the food and material pressure for each copy.');
  const settings = append(element, 'div');
  function select(label, options, selected) {
    const field = append(settings, 'label', label);
    const input = append(field, 'select');
    input.setAttribute('aria-label', label);
    for (const [value, title] of options) append(input, 'option', title).value = value;
    input.value = selected;
    return input;
  }
  const pressures = [['0.75','Abundant'], ['1','Balanced'], ['1.5','Scarce']];
  const a = select('World A pressure', pressures, '0.75');
  const b = select('World B pressure', pressures, '1.5');
  const duration = select('Simulated time', [['60','1 minute'], ['180','3 minutes'], ['300','5 minutes']], '60');
  const run = append(element, 'button', 'Run experiment');
  const cancel = append(element, 'button', 'Cancel experiment');
  run.type = cancel.type = 'button';
  const status = append(element, 'p');
  status.setAttribute('role', 'status');
  const progress = append(element, 'progress');
  progress.setAttribute('aria-label', 'Experiment progress');
  progress.max = 1;
  const results = append(element, 'div');

  let sequence = 0;
  let worker = null;
  let snapshotTimer;
  function finish(message) {
    clearTimeout(snapshotTimer);
    if (worker) worker.terminate();
    worker = null;
    run.hidden = false;
    cancel.hidden = progress.hidden = true;
    a.disabled = b.disabled = duration.disabled = false;
    run.disabled = typeof Worker === 'undefined';
    status.textContent = run.disabled ? 'Experiments need a browser with Web Worker support.' : message;
  }
  function reset() {
    sequence++;
    results.replaceChildren();
    finish('');
  }
  cancel.addEventListener('click', () => {
    sequence++;
    finish('Experiment cancelled.');
    run.focus();
  });
  run.addEventListener('click', () => {
    reset();
    const request = sequence;
    try {
      const url = URL.createObjectURL(new Blob([workerSource], {'type':'application/javascript'}));
      try { worker = new Worker(url); } finally { URL.revokeObjectURL(url); }
      worker.onerror = event => {
        event.preventDefault();
        if (request === sequence) finish('The experiment stopped. You can run it again.');
      };
      worker.onmessage = ({data}) => {
        if (request !== sequence || !worker) return;
        if (data['type'] === 'progress') {
          progress.value = data['value'];
        } else if (data['type'] === 'results') {
          const table = append(results, 'table');
          table.setAttribute('aria-label', 'Paired experiment results');
          const head = table.createTHead().insertRow();
          for (const heading of ['Outcome', 'A · ' + a.selectedOptions[0].textContent, 'B · ' + b.selectedOptions[0].textContent]) {
            append(head, 'th', heading).scope = 'col';
          }
          const body = table.createTBody();
          for (const [key, title] of [['meals','Shared meals'], ['deaths','Deaths'], ['lineages','Surviving lineages']]) {
            const row = body.insertRow();
            append(row, 'th', title).scope = 'row';
            for (const world of data['worlds']) row.insertCell().textContent = String(world[key]);
          }
          const minutes = data['seconds'] / 60;
          const time = data['startTime'];
          const stamp = Math.floor(time / 60) + 'm ' + Math.floor(time % 60) + 's';
          finish('Both worlds ran for ' + minutes + (minutes === 1 ? ' minute' : ' minutes') + ' from world time ' + stamp + '. Meals and deaths count this period. Lineages are counted at the end.');
        }
      };
      run.hidden = true;
      cancel.hidden = progress.hidden = false;
      progress.value = 0;
      a.disabled = b.disabled = duration.disabled = true;
      status.textContent = 'Copying the current world…';
      cancel.focus();
      snapshotTimer = setTimeout(() => {
        if (request === sequence) finish('Could not get a world snapshot. Try again.');
      }, 10000);
      requestSnapshot(request);
    } catch (_) {
      finish('Could not start the experiment worker. Try again.');
    }
  });
  function receive(request, world) {
    if (request !== sequence || !worker) return;
    clearTimeout(snapshotTimer);
    try {
      worker.postMessage({'type':'compare', 'world':world, 'pressures':[Number(a.value), Number(b.value)], 'seconds':Number(duration.value)});
      status.textContent = 'Simulating both worlds…';
    } catch (_) {
      finish('Could not copy the current world. Try again.');
    }
  }

  reset();
  return {element, receive, reset};
}
module.exports = {createExperiment};
