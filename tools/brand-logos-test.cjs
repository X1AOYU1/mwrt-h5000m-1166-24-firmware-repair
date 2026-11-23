const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'overlay/www/luci-static/resources/mwrt-topo.js'), 'utf8');
const logos = JSON.parse(code.match(/var brandLogos\s*=\s*(\{[^\n]+\});/)[1]);
const sources = JSON.parse(fs.readFileSync(path.join(root, 'assets/brand-logos/sources.json'), 'utf8'));
for (const [name, logo] of Object.entries(logos)) {
  assert.equal(logo.body, sources.brands[name].body, name + ': source mismatch');
  assert.equal(logo.viewBox, sources.brands[name].viewBox, name + ': viewBox mismatch');
  assert(!/<script|<foreignObject|onload=|onerror=/i.test(logo.body), name + ': active content');
}
assert(sources.brands.Sharp.source.startsWith('https://global.sharp/'));
assert(!logos['索尼'].body.includes('#FFFFFF'));
const fn = code.slice(code.indexOf('function clientArt('), code.indexOf('\nfunction findClient'));
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined });
  try {
    const page = await browser.newPage({viewport:{width:1100,height:1050},deviceScaleFactor:2});
    await page.setContent('<meta charset="utf-8"><style>body{font-family:Arial;background:#eef3f9}main{display:grid;grid-template-columns:repeat(10,1fr);gap:8px}.card{text-align:center;background:white;padding:8px 0;border-radius:10px;font-size:11px}.card svg{display:block;margin:auto}</style><main></main>');
    await page.evaluate(({logos,fn}) => {
      const render = new Function('brandLogos','brandOf','esc',fn+';return clientArt;')(logos,c=>c.brand,s=>s);
      document.querySelector('main').innerHTML = Object.keys(logos).map(brand=>'<div class="card">'+render({brand},{}).svg+'<p>'+brand+'</p></div>').join('');
    }, {logos,fn});
    const results = await page.locator('.card').evaluateAll(async cards => Promise.all(cards.map(async card => {
      const el=card.querySelector('image'), box=el.getBoundingClientRect(), frame=card.querySelector('svg').getBoundingClientRect();
      const image=new Image(); image.src=el.getAttribute('href'); await image.decode();
      const canvas=document.createElement('canvas');canvas.width=76;canvas.height=76;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,76,76);
      const pixels=ctx.getImageData(0,0,76,76).data;
      let visible=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>64 && Math.min(pixels[i],pixels[i+1],pixels[i+2])<230)visible++;
      return {name:card.textContent,visible,contained:box.left>=frame.left && box.top>=frame.top && box.right<=frame.right && box.bottom<=frame.bottom};
    })));
    for (const result of results) {assert(result.contained,result.name+': overflow');assert(result.visible>12,result.name+': invisible');}
    fs.mkdirSync(path.join(root,'work'),{recursive:true});
    await page.screenshot({path:path.join(root,'work/logo-gallery.png'),fullPage:true});
    console.log(results.length+' brand SVGs loaded, visible and contained; source records matched.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
