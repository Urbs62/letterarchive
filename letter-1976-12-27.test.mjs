import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { readSource } from './archive-import.mjs';

test('1976-12-27 modernizes archive notes while preserving original material', async () => {
  const original = JSON.parse(execFileSync('git', ['show', 'HEAD:letters.json'], { maxBuffer: 20 * 1024 * 1024 }));
  const archive = JSON.parse(await readFile('letters.json', 'utf8'));
  const entry = archive.letters.find(l => l.id === '1976-12-27');
  const before = original.letters.find(l => l.id === entry.id);
  assert.equal(archive.letters.filter(l => l.id === entry.id).length, 1);
  assert.deepEqual(archive.letters.filter(l => l.id !== entry.id), original.letters.filter(l => l.id !== entry.id));
  const expectedItems = before.items.map(item => item.type === 'envelope-front'
    ? { ...item, transcription: 'Tomten\n\n' + item.transcription } : item);
  assert.deepEqual(entry.items, expectedItems, 'only the verified word on the envelope front is added');
  assert(entry.items[0].transcription.startsWith('Tomten\n\nUlf Sandlund\n'));
  assert(!entry.items[1].transcription.includes('Tomten'), 'the word belongs to the front, not the back');
  for (const item of entry.items) {
    assert.deepEqual(await readFile(item.image), execFileSync('git', ['show', `HEAD:${item.image}`], { maxBuffer: 20 * 1024 * 1024 }));
  }
  const parsed = await readSource('letters/1976/1976-12-27/letter.md');
  parsed.sections = parsed.sections.filter(s => ['Iakttagelser', 'Personer', 'Platser'].includes(s.title));
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), entry);
  assert.deepEqual([entry.date, entry.postmarked, entry.writtenDate, entry.senderAge], ['1976-12-27', '1976-12-27', undefined, 14]);
  assert.deepEqual([entry.from, entry.to, entry.fromPlace, entry.toPlace], ['Urban Sandlund', 'Ulf Sandlund', 'Piteå', 'Mölndal']);
  assert.deepEqual(entry.items.map(i => i.type), ['envelope-front', 'envelope-back', 'page']);
  const oldSource = execFileSync('git', ['show', 'HEAD:letters/1976/1976-12-27/letter.md'], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
  const oldPage = oldSource.split('### Transkription\n\n')[1].split('\n\n---')[0].replace('**karta**', 'karta');
  assert.equal(entry.items[2].transcription, oldPage, 'source wording and paragraph breaks preserved; editorial bold removed');
  assert.equal(entry.summary, 'Urban skickar ett kort julbrev till Ulf tillsammans med en karta psoriasisbrevmärken för 12 kronor. Han berättar att han köpt julklappar, fått sin tandställning och färdigställt mandolinen, även om ljudet lämnar en del att önska. I Piteå är det 18 grader kallt.\n\nBrevet avslutas med julhälsningar och ett hälsningsmeddelande till Tabben. Kuvertet är rikt dekorerat med färger, teckningar och ett skämtsamt rim.');
  assert.deepEqual(entry.sections.map(s => s.title), ['Iakttagelser', 'Personer', 'Platser']);
  assert.equal((entry.sections[0].content.match(/^- /gm) || []).length, 3);
  assert(entry.sections[1].content.includes('Tabben – person som Urban ber Ulf hälsa'));
  assert(entry.items[1].transcription.endsWith('Babyn simmar som en löja\ni sin nya fina blöja'));
  assert(!JSON.stringify(entry).includes('lööa'));
});
