import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readSource} from './archive-import.mjs';

const folder='letters/1976/1976-12-30/';
const hash=data=>createHash('sha256').update(data).digest('hex');

test('1976-12-30 preserves the locally reviewed 32 sheets and their image mapping',async()=>{
  const manifest=JSON.parse(await readFile(folder+'derived/manifest.json','utf8'));
  const archive=JSON.parse(await readFile('letters.json','utf8'));
  const entry=archive.letters.find(l=>l.id==='1976-12-30');
  const pages=entry.items.filter(i=>i.type==='page');
  assert.equal(archive.letters.filter(l=>l.id===entry.id).length,1);
  assert.equal(pages.length,32);
  assert.deepEqual(pages.map(p=>p.page),Array.from({length:32},(_,i)=>i+1));
  assert.deepEqual(pages.map(p=>p.label),pages.map(p=>'Sida '+p.page));
  assert.equal(new Set(pages.map(p=>p.image)).size,32);
  assert.equal(new Set(manifest.sheets.map(p=>p.sha256)).size,32);
  assert.equal(entry.items.length,34);
  assert.equal(manifest.optimization.format,'WebP');
  assert.equal(manifest.optimization.quality,95);
  assert.equal(manifest.optimization.lossless,false);
  assert.deepEqual(entry.items.slice(0,2).map(i=>i.type),['envelope-front','envelope-back']);
  assert(!entry.items.some(i=>i.type==='attachment'));
  assert.deepEqual([entry.date,entry.postmarked,entry.writtenDate,entry.senderAge],['1976-12-30','1976-12-30',undefined,14]);
  assert.deepEqual([entry.from,entry.to,entry.fromPlace,entry.toPlace],['Urban Sandlund','Ulf Sandlund','Piteå','Mölndal']);
  const source=await readFile(folder+'letter.md','utf8');
  assert.equal([...source.matchAll(/^## Sida \d+\r?$/gm)].length,32);
  assert(!/^# (Småarken|Bilagor|Personer och referenser|Arkivnotering)\r?$/m.test(source));
  const parsed=await readSource(folder+'letter.md');
  parsed.sections=parsed.sections.filter(s=>['Iakttagelser','Personer','Platser','Djur','Arkivanteckning'].includes(s.title));
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)),entry);
  assert.deepEqual((await readSource(folder+'letter.md')).items,entry.items,'repeat import reads identical page data');
  const expectedSource=page=>page<=6?1:page<=12?2:page<=18?3:page<=24?5:page<=26?6:4;
  for(const [index,sheet] of manifest.sheets.entries()){
    const page=pages[index];
    assert.equal(sheet.page,index+1);
    assert.equal(sheet.source,`page-0${expectedSource(sheet.page)}.jpg`);
    assert.equal(page.image,folder+'derived/'+sheet.file);
    assert.equal(hash(page.transcription),sheet.transcriptionSha256,`reviewed transcription ${sheet.page}`);
    assert.equal(hash(page.description),sheet.descriptionSha256,`editorial description ${sheet.page}`);
    assert(!page.transcription.includes('Notering:'));
    const image=await readFile(page.image);
    assert.equal(hash(image),sheet.sha256);
    assert(page.image.endsWith('.webp'));
    assert.equal(image.toString('ascii',0,4),'RIFF');
    assert.equal(image.toString('ascii',8,16),'WEBPVP8 ');
    assert.equal(image.readUInt32LE(4)+8,image.length);
    assert.equal(image.subarray(23,26).toString('hex'),'9d012a');
    assert.equal(image.readUInt16LE(26)&0x3fff,sheet.rect[2],'original width retained');
    assert.equal(image.readUInt16LE(28)&0x3fff,sheet.rect[3],'original height retained');
    assert.equal(image.length,sheet.bytes);
    assert(sheet.rect[0]>=0&&sheet.rect[1]>=0&&sheet.rect[0]+sheet.rect[2]<=3000&&sheet.rect[1]+sheet.rect[3]<=4000);
  }
  for(const original of [...manifest.sources,...manifest.envelopes]){
    const data=await readFile(folder+original.file);
    assert.equal(hash(data),original.sha256,`original photograph ${original.file}`);
    assert.deepEqual(data,execFileSync('git',['show',`HEAD:${folder+original.file}`],{maxBuffer:20*1024*1024}));
  }
  assert.equal((await readdir(folder)).filter(f=>/^page-\d+\.jpg$/.test(f)).length,6);
  const derivedNames=await readdir(folder+'derived');
  assert.equal(derivedNames.filter(f=>/^sheet-\d+\.webp$/.test(f)).length,32);
  assert.equal(derivedNames.filter(f=>/^sheet-\d+\.png$/.test(f)).length,0,'obsolete PNGs removed after replacement verification');
  const total=manifest.sheets.reduce((sum,sheet)=>sum+sheet.bytes,0);
  assert.equal(total,manifest.optimization.totalBytes);
  assert(total<=25_000_000,'optimized images stay within the reviewed web-size budget');
  assert.equal(manifest.sheets.reduce((sum,sheet)=>sum+sheet.pngBytes,0),manifest.optimization.originalPngTotalBytes);
  assert.equal((entry.sections[0].content.match(/^- /gm)||[]).length,5);
  const note=entry.sections.find(s=>s.title==='Arkivanteckning').content;
  assert(note.includes('ursprungliga ordningen mellan de 32 små arken är osäker'));
  assert(note.includes('[Hemmagjort Canned Heat-pussel](#brev/1976-unknown-canned-heat-puzzle)'));
  assert(entry.sections[0].content.includes('ännu inte fastställt att pusslet föreställer samma bil'));
  const artifact=archive.letters.find(l=>l.id==='1976-unknown-canned-heat-puzzle');
  assert.equal(artifact.type,'artifact');assert.equal(artifact.date,'Troligen 1976');
  for(const item of artifact.items)await readFile(item.image);
  for(const [page,word] of [[10,'Canned Heat'],[23,'flygplanet'],[24,'Användes endast i nödfall'],[27,'piggelin'],[28,'Torbjörn'],[29,'300 st'],[30,'Marve'],[31,'Lars H.'],[32,'Kandidatidiaden:']]){
    assert(pages[page-1].transcription.includes(word),`reviewed words on page ${page}`);
  }
});
