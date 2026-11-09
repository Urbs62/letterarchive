import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {readSource} from './archive-import.mjs';
const march7 = "77-03-07\n\nHar kommit hem från den första skoldan (urk) efter lovet.\nIgår åkte jag och jonas miniskidor. På strömlida. först körde vi\ni skogen. sen gjorde vi banor, vid sidan om backen. jonas hade sitt\nstoppur med sej så vi tog tid på varandra, jonas vann i alla banorna.\nTill sist gjorde vi trix. sista gången jag gjorde det gick det\ninte. jag tog fart. hoppade i ett hopp. landade. snurrade runt.\ntappa balansen. ner i nästa hopp. upp i luften. och ner på\nändan. skidorna flög åt alla håll. typiskt. Utförlig beskrivning\npå baksidan.";
const old='letters/1977/1977-03-03/',folder='letters/1977/1977-04-03/';
const git=f=>execFileSync('git',['show','HEAD:'+f],{maxBuffer:20*1024*1024});
test('corrected date, lossless reviewed source, nine original images and isolated import',async()=>{
 const archive=JSON.parse(await readFile('letters.json','utf8')), baseline=JSON.parse(git('letters.json'));
 const entry=archive.letters.find(l=>l.id==='1977-04-03');
 assert.equal(archive.letters.filter(l=>['1977-03-03','1977-04-03'].includes(l.id)).length,1);
 assert.deepEqual(archive.letters.filter(l=>l!==entry),baseline.letters.filter(l=>l.id!=='1977-03-03'));
 assert.deepEqual([entry.date,entry.writtenDate,entry.postmarked],['1977-04-03','1977-03-03','Okänt']);
 const parsed=JSON.parse(JSON.stringify(await readSource(folder+'letter.md')));parsed.sections=parsed.sections.filter(s=>['Iakttagelser','Arkivanteckning'].includes(s.title));assert.deepEqual(parsed,entry);
 const source=(await readFile(folder+'letter.md','utf8')).replace(/\r\n/g,'\n'), original=git(old+'letter.md').toString('utf8').replace(/\r\n/g,'\n');
 const blocks=[...source.matchAll(/```text\n([\s\S]*?)\n```/g)].map(m=>m[1]);assert.equal(blocks.length,9);
 for(const [i,block] of blocks.entries()){
  const historical=i===2||i===3?block.replace('\n\n---\n\n'+march7,'').replace(/^77-\d\d-\d\d\n\n/,''):block;
  assert(original.includes(historical),'unchanged source block '+i);assert.equal(entry.items[i].transcription,block);
  const relative=entry.items[i].image.slice(folder.length);assert.deepEqual(await readFile(folder+relative),git(old+relative));
 }
 assert.deepEqual(entry.items.filter(i=>i.type==='page').map(i=>i.image),[folder+'page-01.jpg',folder+'page-02.jpg']);
 assert.equal(entry.items.filter(i=>i.type==='attachment').length,5);
 const prior=baseline.letters.find(l=>l.id==='1977-03-03');assert.deepEqual(entry.items.map(i=>i.image.replace(folder,old)),prior.items.map(i=>i.image));
 assert(entry.items[2].transcription.endsWith('\n\n---\n\n'+march7)); assert.equal(entry.items[2].transcription.split('77-03-07').length,2); assert(!entry.sections.find(s=>s.title==='Arkivanteckning').content.includes('saknas')); assert(!entry.summary.includes('skiljer sig från de tidigare genom att det är maskinskrivet'));
});
