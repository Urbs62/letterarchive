import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readSource,importSource} from '../../../archive-import.mjs';

test('1978-07-25 imports the reviewed strip, tube and three attachments exactly once',async()=>{
  const source='letters/1978/1978-07-25/letter.md';
  const parsed=await readSource(source);
  const archive=JSON.parse(await readFile('letters.json','utf8'));
  const entries=archive.letters.filter(l=>l.id==='1978-07-25');
  assert.equal(entries.length,1);
  assert.deepEqual(entries[0],JSON.parse(JSON.stringify(parsed)));
  assert.equal(parsed.writtenDate,'1978-07-22');
  assert.equal(parsed.postmarked,'1978-07-25');
  assert.deepEqual(parsed.items.map(i=>i.image.split('/').at(-1)),[
    'envelope-front.jpg','envelope-back.jpg','page-01.jpg',
    'attachment-01.jpg','attachment-02.jpg','attachment-03.jpg'
  ]);
  const body=parsed.items.find(i=>i.type==='page').transcription;
  assert.match(body,/1978-07-22/);assert.match(body,/1978-07-23/);
  const attachments=parsed.items.filter(i=>i.type==='attachment');
  assert.match(attachments[0].transcription,/BESKRIVNING/);
  assert.match(attachments[1].transcription,/BESKRIVNING/);
  assert.match(attachments[2].transcription,/lagt över frågeformuläret/);
  const original=await readFile('letters.json','utf8');
  await assert.rejects(importSource(source),/already exists/);
  assert.equal(await readFile('letters.json','utf8'),original);
});
