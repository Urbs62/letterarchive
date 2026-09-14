// Real browser smoke test, using Chrome's DevTools pipe; no npm dependencies.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdtemp } from "node:fs/promises";
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
  const { targetId } = await cdp("Target.createTarget", { url: `http://127.0.0.1:${server.address().port}/` });
  const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
  const evaluate = async expression => {
    const result = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  console.log('Browser connected');
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    ready = await evaluate(`!!document.querySelector('.letter-card')`);
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error(await evaluate(`document.documentElement.outerHTML`));
  console.log('Archive loaded');
  const results = await evaluate(`(async () => {
    const checks = [];
    function check(value, label) { if (!value) throw new Error(label); checks.push(label); }
    const imageReady = async () => {
      const image = document.querySelector('.original-frame img');
      check(!!image, 'original image exists');
      await image.decode();
      check(image.naturalWidth > 0, 'image decoded');
    };
    const originalOrder = letters.filter(l => l.type !== 'artifact').slice().sort((a,b) => a.date.localeCompare(b.date)).map(l => l.id);
    check(JSON.stringify(letters.filter(l => l.type !== 'artifact').slice().sort((a,b) => sortValue(a).localeCompare(sortValue(b))).map(l => l.id)) === JSON.stringify(originalOrder), 'legacy chronological order');
    const card = [...document.querySelectorAll('.letter-card')].find(c => c.textContent.includes('Arkivfynd'));
    check(card && card.textContent.includes('Efter 1977-04-08'), 'artifact card and date');
    check(card.closest('.year-group').querySelector('h2').textContent === '1977', 'artifact grouped in 1977');
    check(!card.querySelector('time').hasAttribute('datetime'), 'no invented exact datetime');
    for (const [id, kind] of [['1977-04-04', 'letter'], ['1977-04-09', 'postcard'], ['1977-unknown-intelligenstest', 'artifact']]) {
      history.replaceState(null, '', '#brev/' + id);
      handleRoute();
      check(activeLetter.type === kind, id + ' type and route');
      const current = activeLetter;
      check(document.querySelector('h1').textContent === displayDate(current), id + ' date');
      if (kind !== 'artifact') check(document.querySelector('.letter-heading').textContent.includes(current.to), id + ' recipient');
      for (let index = 0; index < current.items.length; index++) {
        await imageReady();
        check(document.querySelector('.original-frame img').getAttribute('src') === current.items[index].image, id + ' image order ' + index);
        document.querySelector('#transcription-tab').click();
        check(!document.querySelector('#transcription-panel').hidden, 'text tab');
        check((document.querySelector('.transcription-text')?.textContent || '') === (current.items[index].transcription || ''), id + ' exact transcription ' + index);
        document.querySelector('#original-tab').click();
        document.querySelector('.original-frame').click();
        check(!viewer.hidden && viewerContent.querySelector('img').getAttribute('src') === current.items[index].image, 'enlarged image');
        document.querySelector('.viewer-close').click();
        check(viewer.hidden, 'close viewer');
        if (index < current.items.length - 1) document.querySelector('.next-image').click();
      }
      check(document.querySelector('.next-image').disabled, 'last image boundary');
      if (current.items.length > 1) { document.querySelector('.previous-image').click(); check(activeImageIndex === current.items.length - 2, 'previous image'); }
      if (kind === 'artifact') {
        check(document.querySelector('.eyebrow').textContent === 'Arkivfynd', 'artifact type label');
        for (const title of ['Arkivuppgifter', 'Sammanfattning', 'Iakttagelser', 'Personer', 'Platser']) {
          const section = [...document.querySelectorAll('details')].find(s => s.querySelector('summary').textContent.includes(title));
          check(!!section, title + ' section');
          section.querySelector('summary').click();
          check(section.open, title + ' expands');
        }
        check(!document.querySelector('.letter-view').textContent.includes('Urbans ålder'), 'artifact age omitted');
        check(document.querySelector('h1').textContent === 'Efter 1977-04-08', 'artifact date preserved');
        for (const field of current.metadata) check(document.querySelector('.letter-view').textContent.includes(field.label + ': ' + field.value), 'artifact field ' + field.label);
      }
      history.replaceState(null, '', location.pathname); handleRoute();
      check(!!document.querySelector('.letter-card'), 'return to archive');
    }
    for (const date of ['1977', '1977-04', 'Okänt']) {
      const item = { id: 'temporary', type: 'artifact', title: 'Karta', date, dateLabel: date, items: [] };
      renderLetter(item);
      check(document.querySelector('h1').textContent === date, date + ' unchanged date label');
      check(document.querySelector('.original-stage').textContent === 'Inga bilder registrerade.', 'zero images');
    }
    check(archiveYear({ date: 'Okänt' }) === 'Okänt år', 'unknown year group');
    check(formatDate('1976-05-xx') === 'maj 1976', 'legacy month date');
    check(formatDate('1978-unknown-01') === 'Troligen 1978', 'legacy unknown date');
    return checks;
  })()`);
  assert.ok(results.length > 30);
  console.log(`Browser passed: ${results.length} checks (letter, postcard, artifact; images, text, dates, metadata, sections, navigation).`);
} finally {
  try { await cdp("Browser.close"); } catch { browser.kill(); }
  server.close();
  // Chrome can retain profile locks briefly after shutdown. Keep this disposable
  // profile in the OS temp directory rather than touching the user's browser.
  console.log(`Temporary browser profile: ${profile}`);
}
