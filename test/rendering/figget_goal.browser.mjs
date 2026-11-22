import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const model = require('../../src/rendering/figget_life_model.js');
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ui = readFileSync(process.env.FIGGET_COMPILED_UI || '/tmp/figget-life-compiled.js', 'utf8');

function visitorWorld() {
  const w = model.fresh(234, 8);
  w.learning = false;
  w.evolution = false;
  Object.assign(w.player, {x:10, y:10, wood:8, ore:2, food:3});
  const visitor = w.bots[0];
  Object.assign(visitor, {x:16, y:10, health:70, food:0, wood:0, epsilon:0, shield:100});
  w.nodes = w.nodes.filter(n => !(n.y === 10 && [10,16].includes(n.x)));
  w.nodes.push({...w.nodes[0], x:16, y:10, kind:'wood', stock:18, capacity:18, targetCapacity:18});
  // Harvest locally while waiting. Seek a stocked depot when injured and explore after healing.
  visitor.q.fill(-4);
  for (let s=0; s<model.STATES; s++) {
    const row = s*model.ACTIONS.length;
    visitor.q[row+6] = 8;
    visitor.q[row+(Math.floor(s/192) === 2 ? 7 : 1)] = 4;
  }
  w.stats.opening = model.totals(w);
  assert.ok(model.valid(w));
  return {...w, bots:w.bots.map(b => ({...b, q:Array.from(b.q)}))};
}

async function mount(page) {
  await page.evaluate(() => {
    window.app = window.figgetLife.create(document.getElementById('sketch'));
    window.loop = setInterval(() => window.figgetLife.frame(window.app, innerWidth, innerHeight, false), 34);
  });
  await page.waitForSelector('.fl-dock:not([hidden])');
}

async function unmount(page) {
  await page.evaluate(() => {
    clearInterval(window.loop);
    window.figgetLife.dispose(window.app);
  });
}

const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
try {
  const context = await browser.newContext({viewport:{width:390,height:844}, hasTouch:true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://figget.test/**', route => route.fulfill({
    contentType:'text/html',
    body:'<!doctype html><meta name="viewport" content="width=device-width"><div id="sketch" style="position:fixed;inset:0"></div>'
  }));
  await page.goto('https://figget.test/');
  await page.evaluate(w => new Promise((resolve,reject) => {
    for (const b of w.bots) b.q = new Float32Array(b.q);
    const request = indexedDB.open('figget-life-v1',1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('saves','readwrite'), saves = tx.objectStore('saves');
      saves.put(w,'world-v2');
      saves.put({tutorialSeen:true,auto:true},'settings-v2');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => reject(tx.error);
    };
  }), visitorWorld());
  await page.addScriptTag({content:ui});
  await mount(page);
  const button = name => page.getByRole('button',{name,exact:true});
  const goal = page.locator('.fl-goal');
  async function expandGoal() {
    if (!await goal.evaluate(node => node.open)) await goal.locator('summary').click();
  }
  await expandGoal();
  await goal.getByText('Build a depot',{exact:true}).waitFor();
  await button('Hide goal').click();
  await goal.waitFor({state:'hidden'});
  await button('World').click();
  await button('Show depot goal').click();
  if (await button('Close').isVisible()) await button('Close').click();
  await expandGoal();
  await button('Build depot').click();
  await goal.getByText('Stock your depot',{exact:true}).waitFor();
  await page.waitForTimeout(1150); // The game gives building and supplying separate one-second turns.
  await button('Supply').click();
  await goal.getByText(/Food stocked.*waiting for a visitor/i).waitFor();
  await goal.getByText(/Bot 1 recovered 30 health from your food/i).waitFor({timeout:25000});
  const bounds = await goal.boundingBox();
  assert.ok(bounds.x >= -1 && bounds.x+bounds.width <= 391 && bounds.y >= -1 && bounds.y+bounds.height <= 845);
  await button('Follow recipient').click();
  const following = page.locator('.fl-follow');
  await following.getByText(/Following Bot 1\b/).first().waitFor();
  assert.match(await following.innerText(),/health/i);
  await button('Me').click();
  await following.waitFor({state:'hidden'});

  // Re-enter through a saved world and exercise the same follow mode from the Bots list.
  await unmount(page);
  await mount(page);
  await expandGoal();
  await goal.getByText(/Bot 1 recovered 30 health from your food/i).waitFor();
  await button('Visit depot').click();
  assert.match(await page.locator('.fl-dock p').first().innerText(),/10, 10.*Depot/);
  await button('World').click();
  await button('Bots').click();
  await page.getByRole('button',{name:/^Follow Bot 1 · G1/}).click();
  await following.getByText(/Following Bot 1\b/).first().waitFor();
  const initial = await page.locator('.fl-dock p').first().innerText();
  const coords = initial.match(/^\d+, \d+/)?.[0];
  assert.ok(coords,initial);
  await page.waitForFunction(start => {
    const text=document.querySelector('.fl-dock p')?.textContent;
    return text && text.split(' · ')[0] !== start;
  },coords,{timeout:10000});
  await button('Map').click();
  await following.waitFor({state:'hidden'});
  await unmount(page);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS mobile first-depot goal, visitor notification, live bot tracking, save and resume');
} finally {
  await browser.close();
}
