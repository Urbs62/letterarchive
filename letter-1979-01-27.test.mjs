import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readSource} from './archive-import.mjs';

test('1979-01-27 preserves all source pages, originals and editorial information', async () => {
  const backup='source-backups/1979-03-15-letter-original.md', folder='letters/1979/1979-01-27/';
  const bytes=await readFile(backup);
  const source=bytes.toString('utf8').replace(/\r\n/g,'\n');
  const clean=s=>s.replace(/^(?:[\t ]*\n)+/,'').replace(/\n[\t \n]*$/,'');
  const raw=[...source.matchAll(/^## Sida (\d+)\n([\s\S]*?)(?=^## Sida \d+\s*$|^# Bilagor\s*$)/gm)];
  const archive=JSON.parse(await readFile('letters.json','utf8'));
  const entry=archive.letters.find(l=>l.id==='1979-01-27');
  assert.equal(archive.letters.filter(l=>l.id==='1979-01-27').length,1);
  const baseline=JSON.parse(execFileSync('git',['show','HEAD:letters.json'],{maxBuffer:20*1024*1024}));
  assert.deepEqual(archive.letters.filter(l=>l.id!==entry.id),baseline.letters.filter(l=>l.id!==entry.id));
  assert.deepEqual(entry,JSON.parse(JSON.stringify(await readSource(folder+'letter.md'))));
  const pages=entry.items.filter(i=>i.type==='page');
  assert.equal(pages.length,41);
  assert.deepEqual(pages.map(p=>p.page),Array.from({length:41},(_,i)=>i+1));
  assert.deepEqual(pages.map(p=>p.transcription),raw.map(m=>clean(m[2])));
  assert(pages[40].transcription.includes('sidan 40'));
  assert.deepEqual([entry.date,entry.postmarked,entry.from,entry.to],['1979-01-27','Okänt','Ulf Sandlund','Urban Sandlund']);
  assert.equal(entry.items.length,44);
  assert.equal(entry.items.at(-1).transcription,'');
  assert(entry.items.at(-1).description.includes('Ga-Jol'));
  assert(entry.items.slice(0,2).every(i=>i.description&&!i.transcription.includes('Beskrivning:')));
  for(const title of ['Personer','Platser']) assert.equal(entry.sections.find(s=>s.title===title).content,clean(source.split('# '+title+'\n')[1].split(/^# /m)[0]));
  assert(entry.summary.includes('den 27 januari till den 15 mars 1979'));
  assert(entry.sections.find(s=>s.title==='Iakttagelser').content.includes('den 27 januari och den 15 mars 1979'));
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const images=JSON.parse(await readFile('source-backups/1979-03-15-image-sha256.json','utf8'));
  assert.deepEqual(entry.items.map(item=>item.image.slice(folder.length)).sort(),Object.keys(images).sort());
  for(const item of entry.items) {
    assert(item.image.startsWith(folder));
    assert.equal(hash(await readFile(item.image)),images[item.image.slice(folder.length)]);
  }
  assert((await readFile(folder+'preparation-notes.md','utf8')).includes(hash(bytes)));
});
