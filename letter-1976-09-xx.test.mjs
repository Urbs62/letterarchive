import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {readSource,importSource} from './archive-import.mjs';
test('1976-09-xx preserves fourteen authoritative blocks and uncertain identity',async()=>{
const before=await readFile('source-backups/1976-09-xx-letter-20261024-115818.md.bak','utf8');
const after=await readFile('letters/1976/1976-09-05/letter.md','utf8');
const eol=before.includes('\r\n')?'\r\n':'\n';
const titles=['Framsida','Baksida',...Array.from({length:12},(_,i)=>'Sida '+(i+1))];
const blocks=titles.map((h,i)=>{const marker='## '+h+eol+eol,start=before.indexOf(marker)+marker.length;return before.slice(start,before.indexOf(eol+eol+(i===13?'# Sammanfattning':'## '+titles[i+1]),start));});
assert.deepEqual([...after.matchAll(/```text\r?\n([\s\S]*?)\r?\n```/g)].map(m=>m[1]),blocks,'all whitespace byte-identical');
const parsed=await readSource('letters/1976/1976-09-05/letter.md');
const stored=JSON.parse(await readFile('letters.json','utf8')).letters.find(l=>l.id==='1976-09-xx');
assert.equal(stored.id,parsed.id);assert.equal(stored.date,'1976-09-xx');assert.equal(stored.writtenDate,'1976-08-27');assert.equal(stored.postmarked,'Okänt');
for(const key of ['date','writtenDate','postmarked'])assert.equal(parsed[key],stored[key],key);
assert.deepEqual(await readSource('letters/1976/1976-09-05/letter.md'),parsed,'repeated source imports preserve metadata and content');
assert.deepEqual(stored.items,parsed.items);
assert.deepEqual(stored.items.map(i=>i.transcription),blocks.map(b=>b.replaceAll('\r\n','\n')));
assert.deepEqual(stored.items.map(i=>i.image.split('/').at(-1)),['envelope-front.jpg','envelope-back.jpg',...Array.from({length:12},(_,i)=>'page-'+String(i+1).padStart(2,'0')+'.jpg')]);
for(const item of stored.items)await readFile(item.image);
const section=(s,h)=>{const a=s.indexOf('# '+h),end=s.indexOf(eol+'# ',a+1);return s.slice(a,end<0?undefined:end);};
for(const h of ['Sammanfattning','Platser','Djur'])assert.equal(section(after,h),section(before,h));
assert.equal(stored.summary,parsed.summary);assert.deepEqual(stored.sections,parsed.sections.filter(s=>['Iakttagelser','Personer','Platser','Djur'].includes(s.title)));
assert.equal(stored.sections.find(s=>s.title==='Iakttagelser').content.split('\n').filter(l=>l.startsWith('- ')).length,12);
assert(after.includes('Catarina Sandlund – Ulfs storasyster och Urbans kusin.'));assert(after.includes('Birgitta S – Ulfs syster och Urbans kusin.'));
});

test('1976-09-xx import retains dates and refuses a repeated import without changes',async()=>{
  const archiveBefore=await readFile('letters.json');
  const directory=await mkdtemp(path.join(tmpdir(),'letterarchive-date-'));
  const target=path.join(directory,'letters.json');
  try {
    await writeFile(target,'{"letters":[]}\n');
    await importSource('letters/1976/1976-09-05/letter.md',target);
    const imported=await readFile(target,'utf8');
    const [entry]=JSON.parse(imported).letters;
    assert.deepEqual([entry.id,entry.date,entry.writtenDate,entry.postmarked],
      ['1976-09-xx','1976-09-xx','1976-08-27','Okänt']);
    await assert.rejects(importSource('letters/1976/1976-09-05/letter.md',target),/Object already exists: 1976-09-xx/);
    assert.equal(await readFile(target,'utf8'),imported);
    assert.deepEqual(await readFile('letters.json'),archiveBefore);
  } finally {
    await unlink(target);
    await rmdir(directory);
  }
});
