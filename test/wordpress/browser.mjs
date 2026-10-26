const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const origin=process.env.FIGGET_TEST_ORIGIN || 'http://127.0.0.1:8096';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Use a disposable local WordPress instance, never production.');
const code=readFileSync(process.env.FIGGET_COMPILED_UI || '/tmp/figget-compiled.js','utf8');
const errors=[];
async function player(name,width=1280,height=800){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/wp-login.php');await page.locator('#user_login').fill(name);await page.locator('#user_pass').fill('local-player-test-only');await Promise.all([page.waitForNavigation(),page.locator('#wp-submit').click()]);
 await page.route('**/apps/euclid/',route=>route.fulfill({contentType:'text/html',body:'<html><head></head><body data-sketch="Figget-A-Balls" style="margin:0"><div id="sketch" style="position:fixed;inset:0"></div></body></html>'}));
 await page.goto(origin+'/apps/euclid/');await page.addScriptTag({content:code});await page.evaluate(()=>{window.app=window.figgetOnline.create(document.getElementById('sketch'));window.loop=setInterval(()=>window.figgetOnline.frame(window.app,innerWidth,innerHeight,false),34);});
 await page.getByRole('button',{name:'Enter shared world',exact:true}).click();await page.waitForSelector('.fw-dock:not([hidden])');return {page,context};
}
try{
 const ada=await player('Ada'),bo=await player('Bo',390,844);
 const initialText=await ada.page.locator('.fw-dock').innerText();const initialX=Number(initialText.match(/(\d+),/)[1]);
 await ada.page.getByRole('button',{name:'Move east',exact:true}).click();await ada.page.waitForTimeout(800);
 assert.ok((await ada.page.locator('.fw-dock').innerText()).includes((initialX+1)+', 24')); 
 await ada.page.getByRole('button',{name:'Activity',exact:true}).first().click();await ada.page.getByRole('button',{name:'People',exact:true}).click();assert.match(await ada.page.locator('.fw-panel').innerText(),/Ada/);assert.match(await ada.page.locator('.fw-panel').innerText(),/Bo/);
 await bo.page.getByRole('button',{name:'Activity',exact:true}).first().click();assert.match(await bo.page.locator('.fw-panel').innerText(),/Ada arrived/);
 await bo.page.locator('.fw-panel button').filter({hasText:'Ada arrived'}).click();assert.match(await bo.page.locator('.fw-dock').innerText(),/24, 24/);
 await bo.page.getByRole('button',{name:'World map',exact:true}).click();await bo.page.waitForTimeout(100);
 const colors=await bo.page.evaluate(()=>{const c=document.querySelector('.fw-root canvas'),d=c.getContext('2d').getImageData(0,170,c.width,200).data;const colors=new Set();for(let i=0;i<d.length;i+=4)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return colors.size;});assert.ok(colors>10,'map must draw terrain and resources, not a blank canvas');
 await bo.page.screenshot({path:'/tmp/figget-mobile.png'});
 await ada.page.screenshot({path:'/tmp/figget-desktop.png'});
 const auth=await ada.context.request.get(origin+'/wp-admin/admin-ajax.php?action=figget_session');const session=await auth.json();assert.equal(session.loggedIn,true);
 const anon=await browser.newContext();const denied=await anon.request.post(session.api+'sync',{data:{}});assert.equal(denied.status(),401);await anon.close();
 const noNonce=await ada.context.request.post(session.api+'sync',{data:{}});assert.equal(noNonce.status(),401);
 const wrongNonce=await bo.context.request.post(session.api+'sync',{headers:{'X-WP-Nonce':session.nonce},data:{}});assert.equal(wrongNonce.status(),403);
 const valid=await ada.context.request.post(session.api+'sync',{headers:{'X-WP-Nonce':session.nonce},data:{}});assert.equal(valid.status(),200);
 assert.match(valid.headers()['cache-control'],/no-store/);
 const before=(await valid.json()).world;
 const tele=await ada.context.request.post(session.api+'action',{headers:{'X-WP-Nonce':session.nonce},data:{request:'teleport-browser-check',action:{type:'move',x:45,y:45}}});const after=await tele.json();assert.equal(after.world.me.x,before.me.x);assert.match(after.message,/one tile|wait/);
 const concurrent=await Promise.all(Array.from({length:8},()=>ada.context.request.post(session.api+'sync',{headers:{'X-WP-Nonce':session.nonce},data:{}})));assert.ok(concurrent.every(r=>r.status()===200));const revisions=await Promise.all(concurrent.map(async r=>(await r.json()).world.revision));assert.equal(new Set(revisions).size,8);
 await ada.page.getByRole('button',{name:'Online / solo',exact:true}).click();await ada.page.getByRole('button',{name:'Solo expedition',exact:true}).click();await ada.page.waitForTimeout(250);assert.equal(await ada.page.locator('#figget-explorer').isVisible(),true);
 await ada.page.getByRole('button',{name:'Online / solo',exact:true}).click();await ada.page.getByRole('button',{name:'Enter shared world',exact:true}).click();await ada.page.waitForSelector('.fw-dock:not([hidden])');assert.equal(await ada.page.locator('#figget-explorer').isVisible(),false);
 await ada.page.evaluate(()=>window.figgetOnline.dispose(window.app));assert.equal(await ada.page.locator('.fw-root').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: advanced-compiled desktop/mobile, two real WP accounts, actions, activity, people, solo, cleanup; auth/nonce isolation, no-cache, teleport rejection and serialized concurrent transactions');
}finally{await browser.close();}
