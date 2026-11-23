// Embed reviewed official artwork. Run with NODE_PATH pointing to Playwright.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'), jsPath=path.join(root,'overlay/www/luci-static/resources/mwrt-topo.js');
const official=path.join(root,'assets/brand-logos/official');
const manifest=JSON.parse(fs.readFileSync(path.join(official,'manifest.json'),'utf8'));
const srcPath=path.join(root,'assets/brand-logos/sources.json');
const sources=JSON.parse(fs.readFileSync(srcPath,'utf8'));
let code=fs.readFileSync(jsPath,'utf8');const pattern=/var brandLogos\s*=\s*(\{[^\n]+\});/;
const logos=JSON.parse(code.match(pattern)[1]);
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||undefined});try{
 const page=await browser.newPage();
 for(const [brand,entry]of Object.entries(manifest.brands)){
  const bytes=fs.readFileSync(path.join(official,entry.file));let logo;
  if(entry.file.endsWith('.png')){
   const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
   logo={viewBox:`0 0 ${w} ${h}`,body:`<image width="${w}" height="${h}" href="data:image/png;base64,${bytes.toString('base64')}"/>`};
  }else{
   await page.setContent(bytes.toString('utf8').replace(/<\?xml[^>]*>/g,''));
   logo=await page.evaluate(({brand,entry})=>{
    const svg=document.querySelector('svg');
    if(brand==='佳能')svg.querySelectorAll('path:not(.cls-3),polyline,rect').forEach(x=>x.remove());
    svg.querySelectorAll('title,desc,metadata').forEach(x=>x.remove());
    const b=svg.getBBox();if(!b.width||!b.height)throw Error('empty SVG '+brand);
    const box=[b.x,b.y,b.width,b.height].map(n=>Number(n.toFixed(4)));
    const attrs=[...svg.attributes].filter(a=>(['fill','stroke','color','style'].includes(a.name)||a.name.startsWith('xmlns:'))).map(a=>a.name+'="'+a.value+'"').join(' ');
    let body='<g '+attrs+'>'+svg.innerHTML+'</g>';
    return {viewBox:box.join(' '),body};
   },{brand,entry});
  }
  if(entry.background)logo.background=entry.background;
  logos[brand]=logo;
  sources.brands[brand]={...logo,source:entry.source,asset:'assets/brand-logos/official/'+entry.file,assetSha256:crypto.createHash('sha256').update(bytes).digest('hex'),provenance:'official-site',checkedAt:manifest.checkedAt,transform:entry.transform||'Keep official geometry, colors and aspect ratio; trim unused canvas.',fontSource:entry.fontSource||undefined};
 }
 code=code.replace(pattern,'var brandLogos = '+JSON.stringify(logos)+';');
 fs.writeFileSync(jsPath,code);fs.writeFileSync(srcPath,JSON.stringify(sources,null,2)+'\n');
 console.log('Embedded '+Object.keys(manifest.brands).length+' reviewed official assets.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
