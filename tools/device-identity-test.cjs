const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),topoPath=path.join(root,'overlay/www/luci-static/resources/mwrt-topo.js'),behavPath=path.join(root,'overlay/www/luci-static/resources/mwbehav/main.js');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH});try{
for(const width of [1440,420])for(const mode of ['page','popup']){
 const ctx=await browser.newContext({viewport:{width,height:980},reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(12000);
 const examples=[['Android-123','phone'],['my-tablet','tablet'],['Office-PC','pc'],['home-TV','tv'],['game-console','console'],['home-router','router'],['client-abc','unknown'],['Redmi-Note','phone']];
 const clients=examples.map(([name],i)=>({mac:'02:00:00:00:00:'+String(i+1).padStart(2,'0'),ip:'192.168.88.'+(i+2),name,type:'wifi',band:'5G',vendor:i===6?'Unknown Network Inc':'',rssi:-48}));
 const devs=clients.map((c,i)=>({mac:c.mac.toUpperCase(),hostname:i===7?'':c.name,cname:'',vendor:c.vendor,ip:c.ip,band:c.band,online:true,sched:[],apps:'',classes:'',up:0,down:0}));let topoFail=false,saveFail=false;
 await ctx.route('http://router.test/**',async r=>{const u=new URL(r.request().url()),n=u.pathname.split('/').pop();
  if(n==='mwrt-topo.js')return r.fulfill({contentType:'application/javascript',body:fs.readFileSync(topoPath,'utf8')});
  if(n==='main.js')return r.fulfill({contentType:'application/javascript',body:fs.readFileSync(behavPath,'utf8')});
  if(n==='main.css'||n==='brands.js')return r.fulfill({contentType:n.endsWith('css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,'work/behav',n),'utf8')});
  if(n==='topo_data')return r.fulfill(topoFail?{status:503,body:'unavailable'}:{json:{model:'h5000m',clients,egress:{kind:'none'}}});
  if(n==='devices')return r.fulfill({json:{ok:true,devs,now:1795420800}});
  if(n==='caps')return r.fulfill({json:{ok:true,cell:false}});
  if(n==='quotas')return r.fulfill({json:{ok:true,list:[]}});
  if(n==='apps')return r.fulfill({json:{ok:true,apps:[],classes:[],global_block:{}}});
  if(n==='dev_set'){const q=new URLSearchParams(r.request().postData()),d=devs.find(d=>d.mac===q.get('mac'));if(!saveFail){d.icon=q.get('icon');d.cname=q.get('name');}return r.fulfill({json:{ok:!saveFail}});}
  if(n==='overview')return r.fulfill({json:{ok:true,now:1795420800,up:0,down:0,online:8,running:true,enabled:1,clock:true,top_dev:[{mac:clients[7].mac,name:'',up:0,down:0}],series:[],top_app:[],top_cls:[]}});
  if(u.pathname.includes('/mwbehav/'))return r.fulfill({json:{ok:false}});
  return r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><div id="container"></div>'});
 });
 await page.goto('http://router.test/cgi-bin/luci/admin/mwbehav#dev');await page.addScriptTag({url:'http://router.test/luci-static/resources/mwbehav/main.js?v=7'});
 await page.evaluate(mode=>mode==='page'?MwrtBehav.mount(document.getElementById('container')):MwrtBehav.open('dev'),mode);
 await page.locator('.bm-dev').first().waitFor();assert.equal(await page.locator('.bm-dev').count(),8);
 for(let i=0;i<examples.length;i++){const row=page.locator('.bm-dev[data-mac="'+devs[i].mac+'"]'),img=row.locator('.bm-av img');await img.waitFor();await img.evaluate(e=>e.decode());const svg=decodeURIComponent((await img.getAttribute('src')).split(',').slice(1).join(','));if(i===7){assert(svg.includes('data-brand-logo'));assert((await row.innerText()).includes('Redmi'));}else assert(svg.includes('data-device-kind="'+examples[i][1]+'"'),examples[i][0]);
  const box=await img.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.width<=b.width+1&&a.height<=b.height+1;});assert(box);
 }
 // A brand recognized only by topology is merged by case-insensitive MAC and shown in details.
 const red=page.locator('.bm-dev[data-mac="'+devs[7].mac+'"]');await red.locator('[data-a="dev"]').click();assert((await page.locator('#bm-dr').innerText()).includes('Xiaomi Redmi'));
 await page.locator('#bm-dr [data-a="drx"]').click();
 // Actual topology selection updates the open behavior page and its avatar, without another firmware reload.
 await page.evaluate(()=>MwrtTopo.open());await page.locator('[data-id="c:'+clients[0].mac+'"]').click();await page.locator('.mt-avatar').click();await page.locator('[data-brand="type:tablet"]').click();await page.evaluate(()=>MwrtTopo.close());
 const first=page.locator('.bm-dev[data-mac="'+devs[0].mac+'"]');await page.waitForFunction(()=>document.querySelector('#bm-host').shadowRoot.querySelector('.bm-dev .bm-av img'));assert(decodeURIComponent(await first.locator('img').getAttribute('src')).includes('data-device-kind="tablet"'));
 await first.locator('[data-a="dev"]').click();saveFail=true;await page.locator('[data-a="icon"][data-k="phone"]').click();await page.waitForTimeout(120);assert(decodeURIComponent(await page.locator('#bm-dr .bm-av img').getAttribute('src')).includes('data-device-kind="tablet"'));
 saveFail=false;await page.locator('[data-a="icon"][data-k="phone"]').click();await page.waitForFunction(()=>document.querySelector('#bm-host').shadowRoot.querySelector('#bm-dr .bm-av img')?.alt==='手机');
 await page.locator('#bm-dr [data-a="drx"]').click();await page.evaluate(()=>MwrtTopo.open());await page.locator('[data-id="c:'+clients[0].mac+'"]').click();assert.equal(await page.locator('.mt-avatar [data-device-kind="phone"]').count(),1);await page.evaluate(()=>MwrtTopo.close());
 // Cross-tab localStorage preference changes refresh already visible behavior cards.
 const other=await ctx.newPage();await other.goto('http://router.test/');await other.evaluate(mac=>localStorage.setItem('mwrt.topo.brand.v1.'+mac,'华为'),clients[0].mac);await page.waitForFunction(mac=>document.querySelector('#bm-host').shadowRoot.querySelector('.bm-dev[data-mac="'+mac+'"] .bm-av img')?.alt==='华为',devs[0].mac);await other.close();
 // Overview also fetches topology identity before rendering device rankings.
 await page.locator('[data-tab="dash"]').click();await page.locator('#bm-p-dash .bm-av img[alt="Redmi"]').waitFor();
 await page.locator('[data-tab="dev"]').click();await page.locator('.bm-dev').first().waitFor();
 // Screenshot actual production shadow-DOM page at both widths.
 await page.screenshot({path:path.join(root,'work/identity-v7-'+mode+'-'+width+'.png'),fullPage:true});
 // A fresh page still works when topology API is unavailable, using real hostname/cname fields.
 topoFail=true;await page.reload();await page.addScriptTag({url:'http://router.test/luci-static/resources/mwbehav/main.js?v=7'});await page.evaluate(()=>MwrtBehav.mount(document.getElementById('container')));await page.locator('.bm-dev').first().waitFor();assert.equal(await page.locator('.bm-dev').count(),8);
 assert.deepEqual(errors,[]);await ctx.close();console.log(width+' '+mode+': types, merged brand, details, selection, persistence, failed save, cross-tab sync and API failure passed');
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
