import assert from 'node:assert/strict';
import {readFile, writeFile, cp, mkdir, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readSource, importSource} from './archive-import.mjs';

const original = 'letters/1979/1979-03-15/';
const folder = 'letters/1979/1979-01-27/';
const bytes = await readFile(original + 'letter.md');
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
await mkdir(folder, {recursive:true});
assert.deepEqual(await readdir(folder), [], 'Refuse to overwrite prepared files');
for (const name of await readdir(original)) await cp(original+name, folder+name, {recursive:true, force:false, errorOnExist:true});
await writeFile(folder + 'letter.md', prepared);
const parsed = await readSource(folder + 'letter.md');
assert.deepEqual(parsed.items.filter(i=>i.type==='page').map(i=>i.transcription), pages.map(p=>p.text));
assert.deepEqual([parsed.id,parsed.date,parsed.postmarked],['1979-01-27','1979-01-27','Okänt']);
assert.equal(parsed.items.length,44);
assert.equal(parsed.items.at(-1).transcription,'');
await importSource(folder + 'letter.md');
assert.deepEqual(await readFile(original+'letter.md'), bytes);
await writeFile(folder+'preparation-notes.md', `# Preparation notes\n\nOriginal source retained at \`${original}letter.md\`.\nSource SHA-256: ${createHash('sha256').update(bytes).digest('hex')}\n\nArchive identity uses written date 1979-01-27; postmark remains unknown.\nAll 41 page bodies retain their text, indentation, trailing spaces and internal line breaks; CRLF is normalized to LF for import. Blank lines separating Markdown sections are structural. Fenced blocks protect the transcription from Markdown parsing.\n\nSida 41 says “sidan 40”; no renumbering or correction was made.\nSummary and observations only change the writing period to 1979-01-27 through 1979-03-15. People and places are unchanged.\nEnvelope addresses and handwritten text are separated from descriptions without deleting information. The Ga-Jol box is one physical attachment; references to a cassette in the source do not create additional attachments.\n\nThe old folder is retained for review; only the prepared entry is registered in letters.json. The importer refuses an existing id.\n`);
console.log('Prepared and imported 1979-01-27; 41 exact page bodies, 44 images.');
