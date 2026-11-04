import {withBrowserTestResources} from './browser-test-resources.mjs';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const server=createServer(async(req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try {res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.jpg':'image/jpeg','.jpeg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}
  catch {res.writeHead(404).end();}
});
await withBrowserTestResources(server,'1979-01-27',async({browser,profile})=>{
  let id=0,buffer='';const pending=new Map();
  browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}}});
  const cdp=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('DevTools timeout: '+method));},20000);pending.set(n,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);});browser.stdio[3].write(JSON.stringify({id:n,method,params,sessionId})+'\0');});
  const {targetId}=await cdp('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await cdp('Page.enable',{},sessionId);
  await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/#brev/1979-01-27`},sessionId);
  for(let n=0;n<100;n++){if(await evaluate(`!!document.querySelector('.continuous-reading')`))break;await new Promise(r=>setTimeout(r,100));}
  for(const width of [1280,390,320]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600},sessionId);
    const result=await evaluate(`(async()=>{
      const check=(v,m)=>{if(!v)throw Error(m)};
      const l=letters.find(l=>l.id==='1979-01-27'), before=JSON.stringify(l),pages=l.items.filter(i=>i.type==='page');
      const frames=[...document.querySelectorAll('.original-stage .original-frame')];
      check(frames.length===41,'41 stacked originals');
      check(JSON.stringify(frames.map(f=>f.querySelector('img').getAttribute('src')))===JSON.stringify(pages.map(p=>p.image)),'image order');
      document.querySelector('#original-tab').click();
      for(const index of [0,40]){
        const frame=frames[index],image=frame.querySelector('img');
        frame.scrollIntoView({behavior:'instant',block:'center'});await image.decode();
        check(image.naturalWidth>0,'original loads '+index);
        frame.focus({preventScroll:true});const y=scrollY;frame.click();
        await viewerContent.querySelector('img').decode();check(!viewer.hidden,'original lightbox');
        closeViewer();check(document.activeElement===frame&&Math.abs(scrollY-y)<2,'focus and scroll restored');
      }
      document.querySelector('#transcription-tab').click();
      const blocks=[...document.querySelectorAll('.continuous-document > .continuous-text-page')];
      check(blocks.length===41,'41 text pages');
      blocks.forEach((b,i)=>{check(b.querySelector('h2').textContent===pages[i].label,'page label');check(b.querySelector('.transcription-text').textContent===pages[i].transcription,'exact text '+i);});
      const code=blocks[4].querySelector('.transcription-text');check(getComputedStyle(code).whiteSpace==='pre'&&getComputedStyle(code).overflowX==='auto','fixed-width scrolling BASIC');
      check(!document.querySelector('.continuous-paragraph'),'no reflow of preserved lines');
      const material=document.querySelector('#transcription-panel .continuous-material');material.open=true;
      check(material.querySelectorAll('.continuous-text-page').length===3,'two envelopes and one attachment');
      check(material.querySelectorAll('.item-description').length===3,'separate descriptions');
      blocks[40].scrollIntoView();check(blocks[40].textContent.includes('sidan 40'),'final page discrepancy preserved');
      check(document.documentElement.scrollWidth<=innerWidth,'no viewport overflow');
      check(before===JSON.stringify(l),'immutable entry');
      return {pages:blocks.length,width:innerWidth,codeScrolls:code.scrollWidth>code.clientWidth};
    })()`);
    assert.equal(result.pages,41);console.log('PASS',JSON.stringify(result));
    const shot=await cdp('Page.captureScreenshot',{format:'png'},sessionId);await writeFile(path.join(profile,`reader-${width}.png`),Buffer.from(shot.data,'base64'));
  }
});
