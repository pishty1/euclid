import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const model = require('../../src/rendering/figget_life_model.js');
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ui = readFileSync(process.env.FIGGET_COMPILED_UI || '/tmp/figget-life-compiled.js','utf8');
const button = (page,name) => page.getByRole('button',{name,exact:true});

function beginnerWorld(){
  const w=model.fresh(12,8);
  Object.assign(w.player,{x:10,y:10,wood:4,ore:1});
  w.nodes=w.nodes.filter(n=>n.y!==10 || (n.x!==10 && n.x!==11));
  w.nodes.push({...w.nodes[0],x:11,y:10,kind:'wood',stock:3,capacity:3,targetCapacity:3});
  w.stats.opening=model.totals(w);
  return w;
}

function inhabitedWorld(){
  const w=model.fresh(234,9);
  w.bots.shift(); // Bot 1 is the retired founder.
  Object.assign(w.player,{x:10,y:10,wood:8,ore:2,health:60});
  w.stats.opening=model.totals(w);
  const act=(type,more={})=>{
    w.player.readyAt=0;
    return model.playerAction(w,{type,x:10,y:10,...more});
  };
  assert.match(act('build'),/built/i);
  assert.match(act('store',{kind:'food'}),/Stored 2/);
  assert.match(act('take',{kind:'food'}),/Took 2/);
  assert.match(act('eat'),/Recovered 30/);
  const early=minutes=>({
    moves:minutes.at(-1)[0],gathers:minutes.at(-1)[1],healing:minutes.at(-1)[2],minutes
  });
  w.time=240;
  w.nextEvolution=420;
  w.nextHistory=250;
  w.nextId=10;
  w.familyArchive=[{id:1,generation:1,lineage:1,retiredAt:200,
    family:{parentId:null,bornAt:0,early:early([[4,1,5],[7,2,12]])}}];
  Object.assign(w.bots[0],{lineage:1,generation:2,age:180,
    family:{parentId:1,bornAt:60,early:early([[3,2,6],[7,4,18]])}});
  Object.assign(w.bots[1],{lineage:1,generation:3,age:120,
    family:{parentId:2,bornAt:120,early:early([[7,3,12],[12,6,30]])}});
  assert.ok(model.valid(w),'fixture accepted by the production save validator');
  return w;
}

async function openWorld(context,world){
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://figget.test/**',route=>route.fulfill({
    contentType:'text/html',
    body:'<!doctype html><meta name="viewport" content="width=device-width"><div id="sketch" style="position:fixed;inset:0"></div>'
  }));
  await page.goto('https://figget.test/');
  await page.evaluate(w=>new Promise((resolve,reject)=>{
    for(const b of w.bots)b.q=new Float32Array(b.q);
    const request=indexedDB.open('figget-life-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('saves');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('saves','readwrite'),saves=tx.objectStore('saves');
      saves.put(w,'world-v2');
      saves.put({tutorialSeen:true,auto:true},'settings-v2');
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onabort=()=>reject(tx.error);
    };
  }),{...world,bots:world.bots.map(b=>({...b,q:Array.from(b.q)}))});
  await page.addScriptTag({content:ui});
  await page.evaluate(()=>{
    window.app=figgetLife.create(document.getElementById('sketch'));
    window.loop=setInterval(()=>figgetLife.frame(app,innerWidth,innerHeight,false),34);
  });
  await page.waitForSelector('.fl-dock:not([hidden])');
  return {page,errors};
}

async function closeWorld(page){
  await page.evaluate(()=>{clearInterval(loop);figgetLife.dispose(app);});
}

async function checkFirstAction(context){
  const {page,errors}=await openWorld(context,beginnerWorld());
  const instruction=page.locator('.fl-next-step');
  assert.match(await instruction.innerText(),/2 more wood/i);
  await page.locator('.fl-goal summary').click();
  await button(page,'Mark wood').click();
  assert.match(await page.locator('.fl-dock p').first().innerText(),/11, 10.*wood/i);
  await button(page,'Gather').click();
  await page.waitForFunction(()=>document.querySelector('.fl-status').textContent.includes('Wood 5'));
  assert.match(await instruction.innerText(),/1 more wood/i);
  await closeWorld(page);
  assert.deepEqual(errors,[]);
  await page.close();
}

async function checkBirth(context){
  const w=model.fresh(75,8);
  w.time=180;
  w.nextHistory=190;
  w.nextEvolution=188;
  // Keep the mature cohort exploring, with one well-funded parent at the top.
  for(const bot of w.bots){
    Object.assign(bot,{age:180,health:100,food:0,epsilon:0,x:10+bot.id,y:90});
    bot.q.fill(-10);
    for(let s=0;s<model.STATES;s++)bot.q[s*model.ACTIONS.length+7]=5;
  }
  Object.assign(w.bots[0],{food:10,serviceHealth:400});
  w.stats.opening=model.totals(w);
  const {page,errors}=await openWorld(context,w);
  await button(page,'World').click();
  await button(page,'Bots').click();
  await page.getByRole('button',{name:/^Follow Bot 1 · /}).click();
  const notice=button(page,'Follow offspring · Bot 9');
  await notice.waitFor({timeout:20000});
  await notice.click();
  assert.match(await page.locator('.fl-follow').innerText(),/Following Bot 9/);
  await closeWorld(page);
  assert.deepEqual(errors,[]);
  await page.close();
}

async function savedSignature(page){
  return page.evaluate(async()=>{
    const world=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('figget-life-v1',1);
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,read=db.transaction('saves').objectStore('saves').get('world-v2');
        read.onsuccess=()=>{db.close();resolve(read.result);};
        read.onerror=()=>reject(read.error);
      };
    });
    const bytes=new TextEncoder().encode(JSON.stringify(world));
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    return {time:world.time,hash:Array.from(digest).join(',')};
  });
}

async function checkDiscovery(context){
  const {page,errors}=await openWorld(context,inhabitedWorld());
  // Let the worker advance beyond the fixture, then wait for the pause checkpoint.
  await page.waitForTimeout(650);
  await button(page,'Pause').click();
  await button(page,'Resume').waitFor();
  let before;
  for(let i=0;i<50;i++){
    before=await savedSignature(page);
    if(before.time>240)break;
    await page.waitForTimeout(50);
  }
  assert.ok(before.time>240,'live pause checkpoint saved');
  await button(page,'Visitor log').click();
  const log=page.locator('.fl-depot-log');
  await log.waitFor();
  assert.match(await log.innerText(),/stored/i);
  assert.match(await log.innerText(),/took/i);
  assert.match(await log.innerText(),/ate/i);

  await button(page,'Family').click();
  const family=page.getByLabel('Family member');
  await family.selectOption('3');
  const comparison=page.getByRole('table',{name:'Parent and offspring at the same age'});
  const gathered=comparison.getByRole('row',{name:/Units gathered/});
  assert.deepEqual(await gathered.locator('td').allTextContents(),['2.0','3.0']);
  await button(page,'Parent · Bot 2').click();
  assert.equal(await family.inputValue(),'2');
  await button(page,'Parent · Bot 1').click();
  assert.match(await family.locator('option:checked').innerText(),/retired/i);
  assert.equal(await button(page,'Follow Bot 1').count(),0);
  await button(page,'Offspring · Bot 2').click();
  await button(page,'Offspring · Bot 3').click();
  await button(page,'Follow Bot 3').click();
  assert.match(await page.locator('.fl-follow').innerText(),/Following Bot 3/);
  await button(page,'World').click();
  await button(page,'Rules').click();
  await page.getByText('Paired experiment',{exact:true}).click();
  await page.getByLabel('World A pressure').selectOption('1');
  await page.getByLabel('World B pressure').selectOption('1');
  await button(page,'Run experiment').click();
  const results=page.getByRole('table',{name:'Paired experiment results'});
  await results.waitFor({timeout:60000});
  for(const metric of ['Shared meals','Deaths','Surviving lineages']){
    const row=results.getByRole('row').filter({hasText:metric});
    const values=await row.locator('td').allTextContents();
    assert.ok(values.length>=2,metric);
    assert.equal(values.at(-2),values.at(-1),metric+' matches for identical conditions');
  }
  await closeWorld(page);
  // Reopening within this tab waits for the outgoing worker's final write to IndexedDB.
  await page.evaluate(()=>{window.app=figgetLife.create(document.getElementById('sketch'));});
  await page.waitForSelector('.fl-dock:not([hidden])');
  assert.deepEqual(await savedSignature(page),before,'experiment leaves the paused live save unchanged');
  await page.evaluate(()=>figgetLife.dispose(app));
  assert.deepEqual(errors,[]);
  await page.close();
}

const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    const context=await browser.newContext({viewport,hasTouch:viewport.width<600});
    await checkFirstAction(context);
    await checkDiscovery(context);
    await checkBirth(context);
    await context.close();
    console.log('PASS',viewport.width,viewport.height,'newcomer action, depot log, family navigation and isolated paired experiment');
  }
}finally{await browser.close();}
