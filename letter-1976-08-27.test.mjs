import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readSource} from './archive-import.mjs';

test('1976-08-27 preserves eight reviewed pages, envelopes and all aftertext',async()=>{
 const before=await readFile('source-backups/1976-08-27-letter-20261012-204715.md.bak','utf8');
 const after=await readFile('letters/1976/1976-08-27/letter.md','utf8');
 const eol=before.includes('\r\n')?'\r\n':'\n';
 const block=(start,end)=>{const a=before.indexOf(start)+start.length;return before.slice(a,end?before.indexOf(end,a):before.length-eol.length);};
 const expected=[block('### Framsida'+eol+eol,eol+eol+'### Baksida'),block('### Baksida'+eol+eol,eol+eol+'---')];
 const headings=['## Sida 1 – Piteå 76.08.23','## Sida 2','## Sida 3 – Piteå 76.08.24','## Sida 4','## Sida 5 – Urbans rum den 24/8-76','## Sida 6','## Sida 7 – Piteå 76.08.25','## Sida 8'];
 headings.forEach((h,i)=>expected.push(block(h+eol+eol,i<7?eol+eol+headings[i+1]:undefined)));
 const actual=[...after.matchAll(/```text\r?\n([\s\S]*?)\r?\n```/g)].map(m=>m[1]);
 assert.deepEqual(actual,expected,'all ten source blocks byte-identical');
 const parsed=JSON.parse(JSON.stringify(await readSource('letters/1976/1976-08-27/letter.md')));
 parsed.sections=parsed.sections.filter(s=>['Iakttagelser','Personer','Platser'].includes(s.title));
 const stored=JSON.parse(await readFile('letters.json','utf8')).letters.find(l=>l.id==='1976-08-27');
 assert.deepEqual(stored,parsed);
 assert.deepEqual(stored.items.map(i=>i.transcription),expected.map(t=>t.replaceAll('\r\n','\n')));
 assert.deepEqual(stored.items.map(i=>i.image.split('/').at(-1)),['envelope-front.jpg','envelope-back.jpg',...Array.from({length:8},(_,i)=>`page-0${i+1}.jpg`)]);
 for(const item of stored.items)await readFile(item.image);
 for(const title of ['Sammanfattning','Iakttagelser','Personer','Platser']) {
  const extract=s=>{const marker='# '+title+eol+eol;const a=s.indexOf(marker)+marker.length;const next=s.slice(a).search(/\r?\n#{1,2} /);return s.slice(a,next<0?undefined:a+next).replace(/[\r\n]+$/,'');};
  assert.equal(extract(after),extract(before),title+' unchanged');
 }
 assert.equal(stored.date,'1976-08-27');assert.equal(stored.writtenDate,'1976-08-23');
 await readFile('letters/1976/1976-08-27/urban-tavlingscykel-ca-1975-1976.jpg');
});
