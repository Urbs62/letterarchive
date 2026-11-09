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
await withBrowserTestResources(server,'1977-04-03',async({browser,profile})=>{
  let id=0,buffer='';const pending=new Map();
  browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}}});
  const cdp=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('DevTools timeout: '+method));},20000);pending.set(n,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);});browser.stdio[3].write(JSON.stringify({id:n,method,params,sessionId})+'\0');});
  const {targetId}=await cdp('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await cdp('Page.enable',{},sessionId);
  await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/#brev/1977-04-03`},sessionId);
  for(let n=0;n<100;n++){if(await evaluate(`!!document.querySelector('.continuous-reading')`))break;await new Promise(r=>setTimeout(r,100));}
  await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/#brev/1977-03-03`},sessionId);
  await new Promise(r=>setTimeout(r,300));
  assert.equal(await evaluate('location.hash'),'#brev/1977-04-03');
  for(const width of [1280,390,320]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600},sessionId);
    const result=await evaluate(`(async()=>{
      const check=(v,m)=>{if(!v)throw Error(m)};
      const l=letters.find(l=>l.id==='1977-04-03'), before=JSON.stringify(l),pages=l.items.filter(i=>i.type==='page');
      check(l.date==='1977-04-03'&&l.postmarked==='Okänt'&&l.writtenDate==='1977-03-03','correct dates');
      check(!document.querySelector('.image-navigation'),'no pagination');
      const frames=[...document.querySelectorAll('.original-stage .original-frame')];
      check(frames.length===2,'two consecutive originals');
      check(JSON.stringify(frames.map(f=>f.querySelector('img').getAttribute('src')))===JSON.stringify(pages.map(p=>p.image)),'image order');
      document.querySelector('#original-tab').click();
      const originalMaterial=document.querySelector('#original-panel .continuous-material');originalMaterial.open=true;
      const other=l.items.filter(i=>i.type!=='page');
      check(originalMaterial.querySelectorAll('.original-frame').length===7,'two envelope and five attachment photographs');
      check(JSON.stringify([...originalMaterial.querySelectorAll('img')].map(i=>i.getAttribute('src')))===JSON.stringify(other.map(i=>i.image)),'material image order');
      for(const frame of [...frames,...originalMaterial.querySelectorAll('.original-frame')]){
        const img=frame.querySelector('img');frame.scrollIntoView({behavior:'instant',block:'center'});await img.decode();
        check(img.naturalWidth>0,'image loads '+img.getAttribute('src'));
        check(getComputedStyle(img).maxHeight==='none'||!frames.includes(frame),'uncropped full page');
        frame.focus({preventScroll:true});const y=scrollY;frame.click();
        await viewerContent.querySelector('img').decode();
        check(!viewer.hidden&&viewerContent.querySelector('img').getAttribute('src')===img.getAttribute('src'),'correct original enlarges');
        closeViewer();check(document.activeElement===frame&&Math.abs(scrollY-y)<2,'focus and scroll restored');
      }
      document.querySelector('#transcription-tab').click();
      const blocks=[...document.querySelectorAll('.continuous-document > .continuous-text-page')];
      check(blocks.length===2,'two regular text pages');
      blocks.forEach((b,i)=>{check(b.querySelector('h2').textContent===pages[i].label,'page label');check((b.querySelector('.transcription-text')?.textContent || '')===pages[i].transcription,'exact text '+i);});
      check(blocks[0].querySelector('.transcription-text').textContent.endsWith("77-03-07\\n\\nHar kommit hem från den första skoldan (urk) efter lovet.\\nIgår åkte jag och jonas miniskidor. På strömlida. först körde vi\\ni skogen. sen gjorde vi banor, vid sidan om backen. jonas hade sitt\\nstoppur med sej så vi tog tid på varandra, jonas vann i alla banorna.\\nTill sist gjorde vi trix. sista gången jag gjorde det gick det\\ninte. jag tog fart. hoppade i ett hopp. landade. snurrade runt.\\ntappa balansen. ner i nästa hopp. upp i luften. och ner på\\nändan. skidorna flög åt alla håll. typiskt. Utförlig beskrivning\\npå baksidan."),'complete March 7 passage on physical page one');
      const material=document.querySelector('#transcription-panel .continuous-material');material.open=true;
      const materialBlocks=[...material.querySelectorAll('.continuous-text-page')];
      check(materialBlocks.length===7,'two envelopes and five attachment groups');
      check(JSON.stringify(materialBlocks.map(b=>(b.querySelector('.transcription-text')?.textContent || '')))===JSON.stringify(other.map(i=>i.transcription)),'all envelope and attachment lines preserved');
      check(JSON.stringify(materialBlocks.slice(2).map(b=>b.querySelector('.item-title').textContent))===JSON.stringify(l.items.filter(i=>i.type==='attachment').map(i=>i.title)),'all four original titles');
      check([...document.querySelectorAll('.continuous-reading .transcription-text')].every(p=>getComputedStyle(p).whiteSpace==='pre-wrap'),'all reviewed line breaks preserved');
      check(!document.querySelector('.continuous-paragraph'),'no text reflow');
      document.querySelectorAll('.letter-view > details').forEach(d=>d.open=true);
      check(document.querySelector('.letter-view').textContent.includes('Arkivdatum har korrigerats'),'visible editorial date note');
      materialBlocks[6].scrollIntoView({behavior:'instant',block:'center'});
      check(document.documentElement.scrollWidth<=innerWidth,'no viewport overflow');
      check(before===JSON.stringify(l),'immutable entry');
      return {pages:blocks.length,attachments:materialBlocks.length-2,images:frames.length+originalMaterial.querySelectorAll('img').length,width:innerWidth};
    })()`);
    assert.equal(result.pages,2);console.log('PASS',JSON.stringify(result));
    const shot=await cdp('Page.captureScreenshot',{format:'png'},sessionId);await writeFile(path.join(profile,`reader-${width}.png`),Buffer.from(shot.data,'base64'));
  }
});

