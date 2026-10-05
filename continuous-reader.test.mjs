// Real browser smoke test, using Chrome's DevTools pipe; no npm dependencies.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const server = createServer(async (request, response) => {
  const name = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = path.resolve(root, `.${name === "/" ? "/index.html" : name}`);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css", ".jpg": "image/jpeg" };
    response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const profile = await mkdtemp(path.join(tmpdir(), "letterarchive-browser-"));
const executable = process.env.LETTERARCHIVE_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-pipe", "about:blank"], {
  windowsHide: true, stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"]
});
let counter = 0;
let buffer = "";
const pending = new Map();
browser.stdio[4].on("data", chunk => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf("\0")) >= 0) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    if (pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  }
});
function cdp(method, params = {}, sessionId) {
  const id = ++counter;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`DevTools timeout: ${method}`)); }, 60000);
    pending.set(id, message => { clearTimeout(timer); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); });
    browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
  });
}
try {
 const {targetId}=await cdp('Target.createTarget',{url:`http://127.0.0.1:${server.address().port}/#brev/1975-08-27`});
 const {sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 for(let n=0;n<50&&!await evaluate(`!!document.querySelector('.continuous-reading')`);n++)await new Promise(r=>setTimeout(r,100));
 for(const width of [1280,390,320]) {
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600},sessionId);
 for(const id of ['1975-08-27','1974-09-17','1972-12-10','1971-01-31']) {
 console.log(width,id,await evaluate(`(async()=>{
 const l=letters.find(l=>l.id==='${id}'),before=JSON.stringify(l);renderLetter(l);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const check=(v,m)=>{if(!v)throw Error(m)};
 check(!document.querySelector('.image-navigation'),'pagination removed');
 const pages=l.items.filter(i=>i.type==='page');
 const frames=[...document.querySelectorAll('.original-stage .original-frame')];
 await Promise.all(frames.map(f=>f.querySelector('img').decode()));
 check(JSON.stringify(frames.map(f=>f.querySelector('img').getAttribute('src')))===JSON.stringify(pages.map(i=>i.image)),'original order');
 for(const f of frames){f.scrollIntoView({behavior:'instant',block:'center'});const y=scrollY;f.focus({preventScroll:true});f.click();await viewerContent.querySelector('img').decode();check(!viewer.hidden,'lightbox');closeViewer();check(document.activeElement===f&&Math.abs(scrollY-y)<2,'lightbox scroll and focus');}
 document.querySelector('#transcription-tab').click();
 check(JSON.stringify([...document.querySelectorAll('.continuous-document .continuous-text-page')].map(page=>[...page.querySelectorAll('.transcription-text')].map(p=>p.textContent).join('')))===JSON.stringify(pages.map(i=>i.transcription)),'exact text');
 const headings=[...document.querySelectorAll('.continuous-document .continuous-text-page > h2')];check(headings.length===pages.length&&headings.every((h,i)=>h.textContent===pages[i].label&&getComputedStyle(h).fontSize==='12.8px'),'subtle page labels in order');
 headings.forEach((h,i)=>check(h.parentElement.firstElementChild===h,'separator precedes page '+i));
 check([...document.querySelectorAll('.continuous-document .continuous-paragraph:not(.continuous-positioned)')].every(p=>getComputedStyle(p).whiteSpace==='normal'),'prose reflows');
 const descriptions=[...document.querySelectorAll('.continuous-document .item-description p')];check(JSON.stringify(descriptions.map(p=>p.textContent))===JSON.stringify(pages.filter(p=>p.description).map(p=>p.description)),'exact illustration descriptions');
 headings[headings.length-1].scrollIntoView({behavior:'instant',block:'center'});const y=scrollY;moveImage(1);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));check(Math.abs(scrollY-y)<2,'stable reading scroll');
 const material=document.querySelector('#transcription-panel .continuous-material');material.open=true;check(material.querySelectorAll('.continuous-text-page').length===2,'envelope text');
 document.querySelector('#original-tab').click();const originals=document.querySelector('#original-panel .continuous-material');originals.open=true;await Promise.all([...originals.querySelectorAll('img')].map(i=>i.decode()));originals.querySelector('button').click();check(!viewer.hidden,'envelope enlargement');closeViewer();
 check(document.documentElement.scrollWidth<=innerWidth,'no overflow');check(JSON.stringify(l)===before,'unchanged data');
 if(l.id==='1972-12-10') {
   check(pages.length===1&&frames.length===1,'single physical page');
   check(!document.querySelector('.letter-additional-section'),'no duplicate raw envelope aftertext');
   check(![...document.querySelectorAll('.letter-view h2, .letter-view summary')].some(h=>/^(Envelope|Front|Back|Description|Attachments)$/.test(h.textContent.trim())),'no source structure rendered as content');
   check(!document.querySelector('.letter-view').textContent.includes('Bild:')&&!document.querySelector('.letter-view').textContent.includes(String.fromCharCode(96)),'no raw image references or code markers');
   check(!l.sections.some(s=>s.title==='Attachments'),'no empty attachments section');
   for (const panel of [document.querySelector('#original-panel'),document.querySelector('#transcription-panel')]) {
     const envelope=panel.querySelector('.continuous-material');
     check(envelope.parentElement===panel&&envelope===panel.lastElementChild,'normal envelope material follows pages inside reader');
     check(envelope.querySelector('summary').textContent==='Kuvert och övrigt material','existing envelope disclosure');
     check(JSON.stringify([...envelope.querySelectorAll('h2')].map(h=>h.textContent))===JSON.stringify(['Kuvert framsida','Kuvert baksida']),'envelope sides rendered with normal headings');
   }
   check(JSON.stringify([...originals.querySelectorAll('img')].map(i=>i.getAttribute('src')))===JSON.stringify(l.items.filter(i=>i.type!=='page').map(i=>i.image)),'normal envelope originals and order');
   check(document.querySelectorAll('.letter-view > details').length===2,'summary and People follow safe card');
   check(!l.summary.includes('äldsta')&&l.writtenDate==='1972-12-08','new summary and writing date');
   const photo=document.querySelector('.preserved-object');
   check(document.querySelectorAll('.preserved-object').length===1&&photo.parentElement===document.querySelector('.letter-view'),'one separate safe card');
   check(document.querySelector('#transcription-panel').nextElementSibling===photo&&photo.nextElementSibling.querySelector('summary').textContent==='Sammanfattning','safe follows all material before analysis');
   document.querySelector('#transcription-tab').click();
   const positioned=[...document.querySelectorAll('.continuous-positioned')];
   check(positioned.length===4&&positioned.every(p=>getComputedStyle(p).whiteSpace==='pre-line'),'four positioned blocks preserve line breaks');
   check(positioned[0].textContent.trim()==='8/12-72'&&getComputedStyle(positioned[0]).textAlign==='right','positioned date');
   check(positioned.slice(1).every(p=>getComputedStyle(p).textAlign==='center'),'greetings and signature alignment');
   check(positioned[1].textContent.trim()==='HEJ!'&&positioned[2].textContent.trim()==='HEJDÅ'&&positioned[3].textContent.includes('Hälsningar')&&positioned[3].textContent.includes('                    Urban Sandlund'),'intentional headings and signature');
   const image=photo.querySelector('img');await image.decode();
   check(image.getAttribute('src')==='letters/1972/1972-12-10/artifact-junior-safe.jpg','existing safe image');
   check(photo.querySelector('h3').textContent==='Barnkassaskåp – Junior-Safe'&&photo.querySelector('.preserved-object-content p').textContent==='Kassaskåpet som Urban skriver om i brevet finns fortfarande bevarat.','existing safe caption');
   const button=photo.querySelector('button');button.scrollIntoView({behavior:'instant',block:'center'});button.focus({preventScroll:true});const y=scrollY;button.click();await viewerContent.querySelector('img').decode();check(!viewer.hidden&&viewerContent.querySelector('img').getAttribute('src')===image.getAttribute('src'),'safe enlargement');closeViewer();check(document.activeElement===button&&Math.abs(scrollY-y)<2,'safe focus and scroll restoration');
   check(document.documentElement.scrollWidth<=innerWidth,'positioned text and safe no overflow');
 }

 if(l.id==='1971-01-31') {
   check(pages.length===1&&frames.length===1,'single original page');
   check(pages[0].transcription==="Hej Ulf\\n\\nja jag vill turas om att skriva  \\nbrev. I söndas åkte pappa  \\nAndörjan (4,5 mil) han blev  \\n95 av 668 stycken men tråkit nog  \\nvar jag sjuk jag hade ont i magen  \\noch kräktes så jag hade inte så  \\nrolit jag har inte tagit något  \\nmärke vist är det spännande att se  \\npå ishockey men synd att sverige förlorade  \\nishocky mot finland\\n\\nskriv snart\\n\\nURBAN",'reviewed source transcription preserved exactly');
   check(!document.querySelector('.preserved-object'),'no contextual photo');
   check(!document.querySelector('.letter-additional-section'),'no raw source sections');
   const sections=[...document.querySelectorAll('.letter-view > details')];
   check(JSON.stringify(sections.map(s=>s.querySelector('summary').textContent))===JSON.stringify(['Sammanfattning','Iakttagelser','Personer']),'aftertext order and no Places');
   check(document.querySelector('#transcription-panel').nextElementSibling===sections[0],'aftertext follows complete material');
   check(!/###|Bild:/.test(document.querySelector('.letter-view').textContent)&&!document.querySelector('.letter-view').textContent.includes(String.fromCharCode(96)),'no raw Markdown');
   sections.forEach(s=>s.open=true);
   const people=sections[2].textContent;
   check(people.includes('Urban Sandlund')&&people.includes('Ulf Sandlund')&&people.includes('Urbans kusin')&&people.includes('Pappa'),'People identities and relationship');
   check(!l.sections.some(s=>s.title==='Platser'),'no Places data');
   check(l.summary.length<200,'concise summary');
   check(document.documentElement.scrollWidth<=innerWidth,'expanded aftertext no overflow');
 }
 if(l.id==='1974-09-17') {
   const photo=document.querySelector('.preserved-object');
   const summaries=[...document.querySelectorAll('.letter-view > details')];
   check(!photo.closest('#transcription-panel')&&!photo.closest('#original-panel'),'context photo outside complete letter material');
   check(document.querySelectorAll('.preserved-object').length===1&&photo.parentElement===document.querySelector('.letter-view'),'one separate contextual card');
   check(document.querySelector('#transcription-panel').nextElementSibling===photo,'context photo follows complete reader');
   check(photo.nextElementSibling===summaries[0]&&summaries[0].querySelector('summary').textContent==='Sammanfattning','context photo before summary and analysis');
   check(!document.querySelector('.inline-context-photo'),'no experimental inline placement');
   check(photo.querySelector('h3').textContent==='Urban och Frasse','context title unchanged');
   check(JSON.stringify(summaries.map(s=>s.querySelector('summary').textContent))===JSON.stringify(['Sammanfattning','Iakttagelser','Personer','Djur']),'analysis sections order');
   document.querySelector('#transcription-tab').click();
   const contextImage=photo.querySelector('img');await contextImage.decode();check(contextImage.getAttribute('src')==='letters/1974/1974-09-17/urban-frasse.jpg','context image unchanged');
   check(photo.querySelector('.preserved-object-content p').textContent==='Urban och Frasse, fotograferade under samma period som brevet skrevs.','caption unchanged');
   check(!photo.closest('.original-stage'),'archival card distinct from originals');
   check(contextImage.getBoundingClientRect().width<=112,'context thumbnail size unchanged');
   document.querySelector('#transcription-tab').click();
   const button=photo.querySelector('button');button.scrollIntoView({behavior:'instant',block:'center'});button.focus({preventScroll:true});const y=scrollY;button.click();await viewerContent.querySelector('img').decode();check(!viewer.hidden&&viewerContent.querySelector('img').getAttribute('src')===contextImage.getAttribute('src'),'context enlargement');closeViewer();check(document.activeElement===button&&Math.abs(scrollY-y)<2,'context close restores focus and scroll');
   summaries.forEach(s=>s.open=true);check(document.documentElement.scrollWidth<=innerWidth,'expanded analysis no overflow');
   descriptions.forEach(p=>p.closest('details').open=true);check(document.documentElement.scrollWidth<=innerWidth,'expanded descriptions no overflow');
   check(JSON.stringify(l)===before,'all contextual data unchanged');
 }
 if(l.id==='1975-08-27')check(!document.querySelector('.inline-context-photo'),'first prototype unchanged');
 document.querySelector('#transcription-tab').click();headings[Math.min(1,headings.length-1)].scrollIntoView({behavior:'instant',block:'start'});
 return 'text, order, images, envelopes, scroll, layout passed';
 })()`));
 const shot=await cdp('Page.captureScreenshot',{format:'png'},sessionId);await writeFile(path.join(profile,`reader-${id}-${width}.png`),Buffer.from(shot.data,'base64'));
 if(id==='1974-09-17') {
 await evaluate(`document.querySelector('.preserved-object').scrollIntoView({behavior:'instant',block:'center'})`);
 const context=await cdp('Page.captureScreenshot',{format:'png'},sessionId);await writeFile(path.join(profile,`context-${width}.png`),Buffer.from(context.data,'base64'));
 }
 }
 }
 assert.equal(await evaluate(`renderLetter(letters.find(l=>l.id==='1975-05-29'));document.querySelector('.next-image').click();activeImageIndex===1&&!document.querySelector('.continuous-reading')`),true);
 assert.equal(await evaluate(`[...continuousReadingLetterIds].sort().join(',')==='1971-01-31,1972-12-10,1974-09-17,1975-08-27'`),true);
} finally {try{await cdp('Browser.close')}catch{browser.kill()}server.close();console.log(profile);}
