import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {readSource} from './archive-import.mjs';

const folder = 'letters/1977/1977-01-18/';
const gitFile = file => execFileSync('git', ['show', `HEAD:${file}`], {maxBuffer: 20 * 1024 * 1024});

test('1977-01-18 preserves all reviewed text, spacing, page order and original images', async () => {
  const before = JSON.parse(gitFile('letters.json'));
  const archive = JSON.parse(await readFile('letters.json', 'utf8'));
  const entry = archive.letters.find(l => l.id === '1977-01-18');
  const old = before.letters.find(l => l.id === entry.id);
  assert.equal(archive.letters.filter(l => l.id === entry.id).length, 1);
  assert.deepEqual(archive.letters.filter(l => l.id !== entry.id), before.letters.filter(l => l.id !== entry.id));
  assert.deepEqual(entry.items, old.items, 'all seven complete transcriptions, including every line break and space');
  const source = await readFile(folder + 'letter.md', 'utf8');
  const oldSource = gitFile(folder + 'letter.md').toString('utf8').replace(/\r\n/g, '\n');
  const oldBlocks = [...oldSource.matchAll(/\*\*Transkription:\*\*\n\n([\s\S]*?)(?=\n\n(?:\*\*Beskrivning:\*\*|## Sida|# Sammanfattning))/g)].map(m => m[1]);
  const blocks = [...source.replace(/\r\n/g, '\n').matchAll(/```text\n([\s\S]*?)\n```/g)].map(m => m[1]);
  assert.equal(blocks.length, 7);
  assert.deepEqual(blocks, oldBlocks, 'Markdown text blocks preserve reviewed source verbatim');
  assert.deepEqual(blocks, entry.items.map(i => i.transcription));
  const parsed = await readSource(folder + 'letter.md');
  parsed.sections = parsed.sections.filter(s => ['Iakttagelser', 'Personer', 'Djur', 'Platser', 'Arkivanteckning'].includes(s.title));
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), entry);
  const pages = entry.items.filter(i => i.type === 'page');
  assert.deepEqual(pages.map(p => p.page), [1, 2, 3, 4, 5]);
  assert.deepEqual(pages.map(p => p.image), [1, 2, 3, 4, 5].map(n => folder + `page-0${n}.jpg`));
  assert.deepEqual(entry.items.slice(0, 2).map(i => i.type), ['envelope-front', 'envelope-back']);
  for (const item of entry.items) assert.deepEqual(await readFile(item.image), gitFile(item.image));
  assert.deepEqual([entry.date, entry.postmarked, entry.writtenDate, entry.senderAge], ['1977-01-18', '1977-01-18', undefined, 14]);
  assert.deepEqual([entry.from, entry.to, entry.fromPlace, entry.toPlace], ['Urban Sandlund', 'Ulf Sandlund', 'Piteå', 'Mölndal']);
  assert.equal(entry.writingType, 'typewritten');
  assert.equal(entry.summary, old.summary);
  for (const section of old.sections.filter(s => ['Iakttagelser', 'Personer', 'Djur', 'Platser'].includes(s.title))) {
    assert.deepEqual(entry.sections.find(s => s.title === section.title), section);
  }
  assert(pages[1].transcription.includes('77.01.16.'));
  assert(pages[3].transcription.includes('77.01.12.'));
});
