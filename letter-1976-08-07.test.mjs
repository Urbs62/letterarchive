import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readSource} from './archive-import.mjs';

test('1976-08-07 preserves the definitive source and all six originals',async()=>{
 const before=await readFile('source-backups/1976-08-07-letter-20261012.md.bak','utf8');
 const after=await readFile('letters/1976/1976-08-07/letter.md','utf8');
 const parsed=JSON.parse(JSON.stringify(await readSource('letters/1976/1976-08-07/letter.md')));
 const stored=JSON.parse(await readFile('letters.json','utf8')).letters.find(l=>l.id==='1976-08-07');
 parsed.sections=parsed.sections.filter(s=>['Iakttagelser','Personer','Platser','Arkivanteckningar'].includes(s.title));
 assert.deepEqual(stored,parsed);
 const notes=['PIF syftar på **Piteå IF**, en idrottsförening.','**tårbjörn** är Torbjörn, en av Ulfs bästa kompisar. Hans namn förekommer med olika skämtsamma stavningar.','Marie Holm var klasskompis till Ulf.'];
 const eol=before.includes('\r\n')?'\r\n':'\n';
 const fences=[...after.matchAll(/```text\r?\n([\s\S]*?)\r?\n```/g)].map(m=>m[1]);
 assert.equal(fences.length,6);
 const previous=await readFile('source-backups/1976-08-07-letter-before-page-reorder-20261012.md.bak','utf8');
 const previousFences=[...previous.matchAll(/```text\r?\n([\s\S]*?)\r?\n```/g)].map(m=>m[1]);
 assert.deepEqual(fences,[0,1,4,3,2,5].map(i=>previousFences[i]),'Every reordered block remains byte-identical');
 for(const [i,h] of ['Kuvert – framsida','Kuvert – baksida','Page 03','Page 02','Page 01','Page 04'].entries()){
  const marker='# '+h+eol+eol;
  const start=before.indexOf(marker)+marker.length;
  let text=before.slice(start,before.indexOf(eol+eol+'---'+eol+eol,start));
  for(const note of notes)text=text.replace(note,'');
  assert.equal(fences[i],text,`Byte-identical source block ${h}, excluding relocated note text`);
  assert.equal(stored.items[i].transcription,text.replaceAll('\r\n','\n'));
  await readFile(stored.items[i].image);
 }
 const archiveNotes=stored.sections.find(s=>s.title==='Arkivanteckningar').content;
 for(const note of notes)assert(archiveNotes.includes(note));
 for(const title of ['Sammanfattning','Iakttagelser','Personer','Platser']){
  const marker='# '+title+eol+eol;
  const block=s=>{const start=s.indexOf(marker)+marker.length;const end=s.indexOf(eol+'# ',start);return s.slice(start,end<0?undefined:end).trimEnd();};
  assert.equal(block(after),block(before));
 }
 assert.equal(stored.id,'1976-08-07');
 assert.equal(stored.date,'1976-08-07');
 assert.equal(stored.postmarked,'1976-08-07');
 assert.equal(stored.writtenDate,'1976-08-05');
 assert.deepEqual(stored.items.map(i=>i.type),['envelope-front','envelope-back','page','page','page','page']);
 assert.deepEqual(stored.items.map(i=>i.image.split('/').at(-1)),['envelope-front.jpg','envelope-back.jpg','page-01.jpg','page-02.jpg','page-03.jpg','page-04.jpg']);
});
