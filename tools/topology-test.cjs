const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||undefined});try{
 for(const width of [1440,420]){const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(7500);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.text().includes('[MwrtTopo]'))errors.push(m.text())});
 const phone={mac:'02:ab:00:00:00:01',name:'',model:'SM-S928B',vendor:'Qualcomm',type:'wifi',band:'5G',ip:'10.0.0.2',rssi:-52};
 const idata={mac:'7c:71:76:3e:49:01',vendor:'Wuxi Idata Technology Company',name:'',type:'wifi',band:'2.4G',ip:'192.168.88.119'};
 const clients=[idata,phone,{mac:'00:ab:00:00:00:02',name:'Redmi-Note',type:'wifi',band:'2.4G',ip:'10.0.0.3'},{mac:'00:ab:00:00:00:03',name:'WIN-TEST123',type:'wired',ip:'10.0.0.4'}];
 await page.route('http://router.test/**',r=>r.fulfill(r.request().url().includes('/topo_data')?{json:{model:'h5000m',clients,egress:{kind:'none'}}}:{contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Topology test</title>'}));
 async function open(){await page.goto('http://router.test/');for(const f of [process.env.ART_PATH||path.join(root,'work/ui/www/luci-static/resources/mwrt-topo-art.js'),path.join(root,'overlay/www/luci-static/resources/mwrt-topo.js')])await page.addScriptTag({path:f});await page.evaluate(()=>MwrtTopo.open());}
 const loc=s=>page.locator(s), tile=loc('[data-id="c:'+phone.mac+'"]'),avatar=loc('.mt-avatar'),vendor=loc('[data-pk="ven"]');
 async function checkText(sel,text){await page.waitForFunction(([s,t])=>document.querySelector(s)?.textContent===t,[sel,text]);}
 async function choose(label){await avatar.click();await loc('[data-brand="'+label+'"]').click();}
 async function checkArt(target=tile){assert.equal(await target.locator('svg[viewBox="0 0 56 56"]').first().innerHTML(),await avatar.locator('svg svg').first().innerHTML());const [outer,inner]=await avatar.evaluate(el=>[el,el.firstElementChild].map(n=>n.getBoundingClientRect().toJSON()));assert(inner.x>=outer.x-1&&inner.y>=outer.y-1&&inner.x+inner.width<=outer.x+outer.width+1&&inner.y+inner.height<=outer.y+outer.height+1,JSON.stringify({outer,inner}));}
 // Exercise identification independently of rendering, using the same production functions.
 const vm=require('node:vm'),code=fs.readFileSync(path.join(root,'overlay/www/luci-static/resources/mwrt-topo.js'),'utf8');
 const probe={localStorage:{getItem:()=>null}};vm.createContext(probe);
 vm.runInContext(code.slice(code.indexOf('function devKind('),code.indexOf('/* ---- 在线设备排序'))+code.slice(code.indexOf('var brandCatalog'),code.indexOf('function clientArt(')),probe);
 for(const [client,expected] of [
  [{name:'Redmi-Note',mac:'92:8e:ab:f1:d9:46'},'Redmi'],
  [{hostname:'iPhone',mac:'92:8e:ab:f1:d9:46'},'Apple'],
  [{model:'SM-S928B',vendor:'Qualcomm'},'三星'],
  [{name:'Android',vendor:'Samsung Electronics',mac:'00:11:22:33:44:55'},'三星'],
  [{name:'Android',vendor:'Apple, Inc.',mac:'00:11:22:33:44:55'},'Apple'],
  [{name:'Android',vendor:'Qualcomm',mac:'00:11:22:33:44:55'},'未识别'],
  [{vendor:'Apple, Inc.',mac:'92:8e:ab:f1:d9:46'},'随机 MAC（无法判断厂商）'],
  [{name:'',mac:'92:8e:ab:f1:d9:46'},'随机 MAC（无法判断厂商）'],
  [{name:'',mac:'00:11:22:33:44:55'},'未识别']
 ])assert.equal(probe.vendorLabel(client),expected,JSON.stringify(client));
 for(const [client,expected] of [[{model:'Galaxy Tab S9'},'tablet'],[{name:'BRAVIA TV'},'tv'],[{name:'Nintendo Switch'},'console'],[{name:'home-router'},'router'],[{name:'Office PC'},'pc'],[{friendly_name:'iPhone 16'},'phone'],[{device_name:'MacBook Pro'},'laptop'],[{client_name:'Hikvision camera'},'camera'],[{host_name:'Canon printer'},'printer']]) assert.equal(probe.devKind(client),expected,JSON.stringify(client));
 await open();await checkText('[data-b="hub:low"]','2.4G · 2 台');await checkText('[data-b="hub:high"]','5G · 1 台');await tile.click();await checkText('[data-pk="ven"]','Samsung Electronics（三星）');await checkArt();await choose('荣耀');await checkText('[data-pk="ven"]','荣耀');await checkArt();await open();await tile.click();await checkText('[data-pk="ven"]','荣耀');await choose('');await checkText('[data-pk="ven"]','Samsung Electronics（三星）');
 await loc('[data-pclose]').click();const idataTile=loc('[data-id="c:'+idata.mac+'"]');await idataTile.click();await checkText('[data-pk="ven"]',idata.vendor);await checkArt(idataTile);
 const fallback=await avatar.locator('image').getAttribute('href');assert.match(decodeURIComponent(fallback),/>WI<\/text>/);
 await avatar.locator('image').evaluate(async el=>{const img=new Image();img.src=el.getAttribute('href');await img.decode();});
 await choose('华为');await checkText('[data-pk="ven"]','Huawei Technologies Co., Ltd.（华为）');await checkArt(idataTile);await choose('');await checkText('[data-pk="ven"]',idata.vendor);await checkArt(idataTile);assert.equal(await avatar.locator('image').getAttribute('href'),fallback);
 await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:path.join(root,'work/vendor-avatar-'+width+'.png')});await loc('[data-pclose]').click();await open();await idataTile.click();await checkText('[data-pk="ven"]',idata.vendor);assert.equal(await avatar.locator('image').getAttribute('href'),fallback);await checkArt(idataTile);
 phone.band='2.4G';await page.waitForFunction(()=>!document.querySelector('[data-b="hub:high"]'),null,{timeout:15000});await checkText('[data-b="hub:low"]','2.4G · 3 台');await loc('[data-pclose]').click();
 for(let i=0;i<14;i++)clients.push({mac:'02:ab:00:00:01:'+i.toString(16).padStart(2,'0'),name:'Android',band:'5G',type:'wifi',ip:'10.0.0.'+(20+i)});
 await loc('[data-id="more"]').click();assert.equal(await loc('[data-li]').count(),clients.length);await loc('[data-li]').last().click();await checkText('[data-pk="ven"]','随机 MAC（无法判断厂商）');await loc('[data-pclose]').click();clients.length=0;await page.waitForFunction(()=>document.querySelectorAll('[data-b^="hub:"]').length===0&&!!document.querySelector('.mt-empty'));assert.deepEqual(errors,[]);await page.close();console.log(width+'px: passed');}
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
