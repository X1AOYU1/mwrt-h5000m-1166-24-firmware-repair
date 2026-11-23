const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||undefined});try{
 for(const width of [1440,420]){const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(7500);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.text().includes('[MwrtTopo]'))errors.push(m.text())});
 const phone={mac:'02:ab:00:00:00:01',name:'Yu-de-S24-Ultra',vendor:'Qualcomm',type:'wifi',band:'5G',ip:'10.0.0.2',rssi:-52};
 const clients=[phone,{mac:'00:ab:00:00:00:02',name:'Redmi-Note',type:'wifi',band:'2.4G',ip:'10.0.0.3'},{mac:'00:ab:00:00:00:03',name:'WIN-TEST123',type:'wired',ip:'10.0.0.4'}];
 await page.route('http://router.test/**',r=>r.fulfill(r.request().url().includes('/topo_data')?{json:{model:'h5000m',clients,egress:{kind:'none'}}}:{contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Topology test</title>'}));
 async function open(){await page.goto('http://router.test/');for(const f of [process.env.ART_PATH||path.join(root,'work/ui/www/luci-static/resources/mwrt-topo-art.js'),path.join(root,'overlay/www/luci-static/resources/mwrt-topo.js')])await page.addScriptTag({path:f});await page.evaluate(()=>MwrtTopo.open());}
 const loc=s=>page.locator(s), tile=loc('[data-id="c:'+phone.mac+'"]'),avatar=loc('.mt-avatar'),vendor=loc('[data-pk="ven"]');
 async function checkText(sel,text){await page.waitForFunction(([s,t])=>document.querySelector(s)?.textContent===t,[sel,text]);}
 async function choose(label){await avatar.click();await loc('[data-brand="'+label+'"]').click();}
 async function checkArt(){assert.equal(await tile.locator('svg[viewBox="0 0 56 56"]').first().innerHTML(),await avatar.locator('svg svg').first().innerHTML());const [outer,inner]=await avatar.evaluate(el=>[el,el.firstElementChild].map(n=>n.getBoundingClientRect().toJSON()));assert(inner.x>=outer.x-1&&inner.y>=outer.y-1&&inner.x+inner.width<=outer.x+outer.width+1&&inner.y+inner.height<=outer.y+outer.height+1,JSON.stringify({outer,inner}));}
 await open();await checkText('[data-b="hub:low"]','2.4G · 1 台');await checkText('[data-b="hub:high"]','5G · 1 台');await tile.click();await checkText('[data-pk="ven"]','三星');await checkArt();await choose('荣耀');await checkText('[data-pk="ven"]','荣耀');await checkArt();await open();await tile.click();await checkText('[data-pk="ven"]','荣耀');await choose('');await checkText('[data-pk="ven"]','三星');
 phone.band='2.4G';await page.waitForFunction(()=>!document.querySelector('[data-b="hub:high"]'),null,{timeout:15000});await checkText('[data-b="hub:low"]','2.4G · 2 台');await loc('[data-pclose]').click();
 for(let i=0;i<14;i++)clients.push({mac:'02:ab:00:00:01:'+i.toString(16).padStart(2,'0'),name:'Android',band:'5G',type:'wifi',ip:'10.0.0.'+(20+i)});
 await loc('[data-id="more"]').click();assert.equal(await loc('[data-li]').count(),clients.length);await loc('[data-li]').last().click();await checkText('[data-pk="ven"]','未识别');await loc('[data-pclose]').click();clients.length=0;await page.waitForFunction(()=>document.querySelectorAll('[data-b^="hub:"]').length===0&&!!document.querySelector('.mt-empty'));assert.deepEqual(errors,[]);await page.close();console.log(width+'px: passed');}
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
