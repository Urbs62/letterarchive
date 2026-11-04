import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {readSource} from './archive-import.mjs';

const folder = 'letters/1977/1977-03-02/';
const gitFile = file => execFileSync('git', ['show', `HEAD:${file}`], {maxBuffer: 20 * 1024 * 1024});
const lf = text => text.replace(/\r\n/g, '\n');
const titles = ['Intelligenstest 1 och 2', 'Svar till intelligenstest 1 och 2',
  'Intelligenskvotstabell och resultatkurva', 'Historier och ordlekar'];

test('1977-03-02 preserves every reviewed body, original image and editorial section', async () => {
  const archive = JSON.parse(await readFile('letters.json', 'utf8'));
  const baseline = JSON.parse(gitFile('letters.json'));
  const entry = archive.letters.find(l => l.id === '1977-03-02');
  const old = baseline.letters.find(l => l.id === entry.id);
  assert.equal(archive.letters.filter(l => l.id === entry.id).length, 1);
  assert.deepEqual(archive.letters.filter(l => l.id !== entry.id), baseline.letters.filter(l => l.id !== entry.id));
  assert.deepEqual(entry.items, old.items, 'all eleven transcriptions, titles, image mappings and descriptions unchanged');
  const source = lf(await readFile(folder + 'letter.md', 'utf8'));
  const blocks = [...source.matchAll(/```text\n([\s\S]*?)\n```/g)].map(m => m[1]);
  assert.equal(blocks.length, 11);
  assert.deepEqual(blocks, entry.items.map(i => i.transcription));
  const oldSource = lf(gitFile(folder + 'letter.md').toString('utf8'));
  const oldBlocks = oldSource.includes('```text\n')
    ? [...oldSource.matchAll(/```text\n([\s\S]*?)\n```/g)].map(m => m[1])
    : [...oldSource.matchAll(/^## (?:Framsida|Baksida|Sida \d+|Bilaga \d+[^\n]*)\n\n([\s\S]*?)(?=\n\n(?:## (?:Baksida|Sida \d+|Bilaga \d+)|# Sammanfattning)|(?![\s\S]))/gm)].map(m => m[1]);
  assert.deepEqual(blocks, oldBlocks, 'every line break, blank line, spelling and space from the reviewed Markdown');
  const parsed = JSON.parse(JSON.stringify(await readSource(folder + 'letter.md')));
  parsed.sections = parsed.sections.filter(s => ['Iakttagelser', 'Personer', 'Arkivanteckning'].includes(s.title));
  assert.deepEqual(parsed, entry);
  assert.equal(entry.summary, old.summary);
  for (const title of ['Iakttagelser', 'Personer']) {
    assert.deepEqual(entry.sections.find(s => s.title === title), old.sections.find(s => s.title === title));
  }
  assert.deepEqual([entry.date, entry.postmarked, entry.writtenDate, entry.senderAge], ['1977-03-02', '1977-03-02', undefined, 14]);
  assert.deepEqual([entry.from, entry.to, entry.fromPlace, entry.toPlace], ['Urban Sandlund', 'Ulf Sandlund', 'Piteå', 'Mölndal']);
  assert.equal(entry.writingType, 'typewritten');
  const pages = entry.items.filter(i => i.type === 'page');
  assert.deepEqual(pages.map(p => p.page), [1, 2, 3, 4, 5]);
  assert.deepEqual(pages.map(p => p.image), pages.map(p => folder + `page-0${p.page}.jpg`));
  assert(pages[0].transcription.includes('[Här följer en handritad karta över Snowracerbanan.]'));
  assert(pages[0].transcription.includes('- Stenhård tvättlina'));
  assert(pages[4].transcription.includes('\n77-02-01\n'));
  assert(entry.summary.includes('från 22 februari till 1 mars'));
  assert(entry.sections.find(s => s.title === 'Arkivanteckning').content.includes('77-02-01'));
  const attachments = entry.items.filter(i => i.type === 'attachment');
  assert.deepEqual(attachments.map(a => a.label), [1, 2, 3, 4].map(n => `Bilaga ${n}`));
  assert.deepEqual(attachments.map(a => a.title), titles);
  assert.deepEqual(attachments.map(a => a.image), [1, 2, 3, 4].map(n => folder + `attachments/attachment-0${n}.jpg`));
  assert(attachments[2].transcription.includes('| Antal rätt | Tyder på att ni är | Intelligenskvot |'));
  assert.equal(attachments[2].transcription.split('\n').filter(l => /^\| [0-8] \|/.test(l)).length, 9);
  for (const name of ['Catarina', 'Ulf', 'Birgitta']) assert(attachments[2].transcription.includes(name));
  assert.deepEqual(entry.items.slice(0, 2).map(i => i.type), ['envelope-front', 'envelope-back']);
  const images = [...(await readdir(folder)).filter(n => n.endsWith('.jpg')),
    ...(await readdir(folder + 'attachments')).map(n => 'attachments/' + n)];
  assert.equal(images.length, 11);
  for (const image of images) assert.deepEqual(await readFile(folder + image), gitFile(folder + image), image);
});
