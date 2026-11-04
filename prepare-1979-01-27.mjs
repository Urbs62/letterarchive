import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readSource} from './archive-import.mjs';

// Read-only verification of the completed import; never overwrites archive files.
const backup = 'source-backups/1979-03-15-letter-original.md';
const folder = 'letters/1979/1979-01-27/';
const bytes = await readFile(backup);
const source = bytes.toString('utf8').replace(/\r\n/g, '\n');
const clean = s => s.replace(/^(?:[\t ]*\n)+/, '').replace(/\n[\t \n]*$/, '');
const pages = [...source.matchAll(/^## Sida (\d+)\n([\s\S]*?)(?=^## Sida \d+\s*$|^# Bilagor\s*$)/gm)]
  .map(m => ({page: Number(m[1]), text: clean(m[2])}));
assert.deepEqual(pages.map(p => p.page), Array.from({length:41}, (_, i) => i + 1));
assert(!pages.some(p => p.text.includes('```')));
const block = (start, end) => clean(source.slice(source.indexOf(start) + start.length, source.indexOf(end)));
const front = block('## Framsida\n', '## Baksida\n');
const back = block('## Baksida\n', '## Sida 1\n');
const split = s => {const at=s.indexOf('\n\nBeskrivning:\n'); assert(at>0); return [s.slice(0,at), s.slice(at+2)];};
const [frontAddress, frontDetails] = split(front);
const handAt = frontDetails.indexOf('\n\nHandskriven text:\n');
const otherAt = frontDetails.indexOf('\nÖvrigt:\n');
assert(handAt>0 && otherAt>handAt);
const frontText = frontAddress + '\n\n' + frontDetails.slice(handAt+2,otherAt);
const frontDescription = frontDetails.slice(0,handAt) + '\n' + frontDetails.slice(otherAt);
const [backText, backDescription] = split(back);
const attachment = block('## Bilaga 1\n', '# Sammanfattning\n');
const editorial = source.slice(source.indexOf('# Sammanfattning\n'))
  .replace('från januari och början av mars 1979', 'från den 27 januari till den 15 mars 1979')
  .replace('mellan den 27 januari och den 3 mars 1979', 'mellan den 27 januari och den 15 mars 1979');
const fenced = text => '### Transcription\n\n```text\n' + text + '\n```\n\n';
let prepared = source.slice(0,source.indexOf('# Kuvert\n')) + '# Kuvert\n\n';
for (const [heading,text,description] of [['Framsida',frontText,frontDescription],['Baksida',backText,backDescription]]) {
  prepared += '## ' + heading + '\n\n' + fenced(text) + '### Description\n\n' + description + '\n\n';
}
prepared += '# Brev\n\n';
for (const page of pages) prepared += '## Sida ' + page.page + '\n\n' + fenced(page.text);
prepared += '# Bilagor\n\n## Bilaga 1\n\n### Description\n\n' + attachment + '\n\n' + editorial;
const actual = (await readFile(folder+'letter.md','utf8')).replace(/\r\n/g,'\n');
assert.equal(actual, prepared, 'Imported Markdown differs from the prepared source');
const parsed = JSON.parse(JSON.stringify(await readSource(folder+'letter.md')));
const archive = JSON.parse(await readFile('letters.json','utf8'));
assert.deepEqual(archive.letters.find(letter=>letter.id==='1979-01-27'),parsed);
const images = JSON.parse(await readFile('source-backups/1979-03-15-image-sha256.json','utf8'));
assert.equal(Object.keys(images).length,44);
assert.deepEqual(parsed.items.map(item=>item.image.slice(folder.length)).sort(),Object.keys(images).sort());
for (const item of parsed.items) {
  assert(item.image.startsWith(folder));
  assert.equal(createHash('sha256').update(await readFile(item.image)).digest('hex'),images[item.image.slice(folder.length)]);
}
assert((await readFile(folder+'preparation-notes.md','utf8')).includes(createHash('sha256').update(bytes).digest('hex')));
console.log('Verified 1979-01-27 against backed-up source: 41 exact page bodies, 44 image hashes; no files changed.');
