const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const code=readFileSync(process.env.FIGGET_COMPILED_UI || '/tmp/figget-life-compiled.js','utf8');
try{
 for(const [width,height,fallback]of [[1280,800,false],[390,844,false],[320,568,true],[844,390,false]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.isNavigationRequest())requests.push(r.url());});
  await page.route('https://figget.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta charset="utf-8"></head><body style="margin:0"><nav style="position:fixed;z-index:25;top:12px;left:12px;color:white">☰ Sketches</nav><div id="sketch" style="position:fixed;inset:0"></div></body></html>'}));
  await page.goto('https://figget.test/');if(fallback)await page.evaluate(()=>window.Worker=undefined);
  await page.addScriptTag({content:code});await page.evaluate(()=>{window.menu=false;window.app=window.figgetLife.create(document.getElementById('sketch'));window.loop=setInterval(()=>window.figgetLife.frame(window.app,innerWidth,innerHeight,window.menu),34);});
  await page.waitForSelector('.fl-dock:not([hidden])');await page.waitForTimeout(1300);assert.deepEqual(errors,[]);
  assert.match(await page.locator('.fl-status').innerText(),/RIVALS/);
  const start=await page.locator('.fl-dock p').first().innerText();await page.getByRole('button',{name:'Move east',exact:true}).click();await page.waitForTimeout(200);
  assert.notEqual(await page.locator('.fl-dock p').first().innerText(),start);
  await page.getByRole('button',{name:'World',exact:true}).click();await page.getByRole('button',{name:'Rules',exact:true}).click();
  const settings=page.getByLabel('Rival population');const option=fallback?'64':'512';await settings.selectOption(option);await page.waitForTimeout(700);assert.match(await page.locator('.fl-status').innerText(),new RegExp(option+' RIVALS'));
  await page.waitForTimeout(1200);assert.equal(await settings.evaluate(n=>n.isConnected),true);
  await page.getByLabel('Learning and evolution').uncheck();await page.waitForTimeout(400);assert.equal(await page.getByLabel('Learning and evolution').isChecked(),false);
  await page.getByLabel('Learning and evolution').check();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  const pixels=await page.locator('.fl-root>canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,170,c.width,100).data,s=new Set();for(let i=0;i<d.length;i+=4)s.add(d[i]+','+d[i+1]+','+d[i+2]);return s.size;});assert.ok(pixels>10);
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(150);const paused=await page.locator('.fl-status').innerText();await page.waitForTimeout(800);assert.equal(await page.locator('.fl-status').innerText(),paused);
  await page.getByRole('button',{name:'Resume',exact:true}).click();await page.evaluate(()=>window.menu=true);await page.waitForTimeout(200);const menu=await page.locator('.fl-status').innerText();await page.waitForTimeout(800);assert.equal(await page.locator('.fl-status').innerText(),menu);await page.evaluate(()=>window.menu=false);
  await page.getByRole('button',{name:'Map',exact:true}).click();await page.waitForTimeout(100);await page.screenshot({path:`/tmp/figget-life-${width}.png`});
  await page.evaluate(()=>{clearInterval(window.loop);window.figgetLife.dispose(window.app);});await page.waitForTimeout(500);assert.equal(await page.locator('.fl-root').count(),0);
  const saved=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('figget-life-v1',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('saves').objectStore('saves').get('world');q.onsuccess=()=>{const w=q.result;resolve({time:w.time,count:w.bots.length,updates:w.totalUpdates,q:w.bots[0].q.constructor.name});db.close();};q.onerror=()=>reject(q.error);};}));assert.equal(saved.count,Number(option));assert.ok(saved.time>1);assert.ok(saved.updates>0);assert.equal(saved.q,'Float32Array');
  await page.evaluate(()=>{window.app=window.figgetLife.create(document.getElementById('sketch'));window.loop=setInterval(()=>window.figgetLife.frame(window.app,innerWidth,innerHeight,false),34);});await page.waitForSelector('.fl-dock:not([hidden])');assert.match(await page.locator('.fl-status').innerText(),new RegExp(option+' RIVALS'));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await page.evaluate(()=>{clearInterval(window.loop);window.figgetLife.dispose(window.app);});await page.waitForTimeout(100);await context.close();console.log('PASS',width,height,fallback?'fallback':'worker','controls, learning, pause/menu, save/resume, map pixels, no network');
 }

 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.route('https://figget.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta charset="utf-8"></head><body><div id="sketch" style="position:fixed;inset:0"></div></body></html>'}));
 await page.goto('https://figget.test/');await page.evaluate(()=>{Object.defineProperty(window,'indexedDB',{value:undefined});const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);window.testWorker=this;}};});
 await page.addScriptTag({content:code});await page.evaluate(()=>{window.app=window.figgetLife.create(document.getElementById('sketch'));window.loop=setInterval(()=>window.figgetLife.frame(window.app,innerWidth,innerHeight,false),34);});
 await page.waitForSelector('.fl-dock:not([hidden])');await page.waitForTimeout(300);await page.getByRole('button',{name:'Move east',exact:true}).click();await page.waitForTimeout(150);assert.match(await page.locator('.fl-dock p').first().innerText(),/49, 48/);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(150);await page.evaluate(()=>window.testWorker.dispatchEvent(new ErrorEvent('error',{'message':'simulated worker failure','cancelable':true})));await page.waitForTimeout(150);
 assert.match(await page.locator('.fl-dock p').first().innerText(),/49, 48/);await page.getByRole('button',{name:'World',exact:true}).click();assert.match(await page.locator('.fl-panel').innerText(),/Storage unavailable/);
 await page.evaluate(()=>{clearInterval(window.loop);window.figgetLife.dispose(window.app);});await context.close();console.log('PASS storage unavailable, worker recovery retains in-memory checkpoint');
}finally{await browser.close();}
