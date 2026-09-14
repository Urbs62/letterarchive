import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArchiveMarkdown } from "./archive-markdown.mjs";
import { discoverSources, readSource, importSource } from "./archive-import.mjs";

const source = "archive-finds/1977-unknown-intelligenstest/artifact.md";
const parse = (text, images = []) => parseArchiveMarkdown(text, {
  fileName: "artifact.md", folder: "archive-finds/example/", documentImages: images
});

test("discovers all three source types and imports the real artifact without changing text", async () => {
  const sources = await discoverSources();
  for (const name of [source, "letters/1977/1977-04-04/letter.md", "letters/1977/1977-04-09/postcard.md"]) assert.ok(sources.includes(name));
  const artifact = await readSource(source);
  const text = (await readFile(source, "utf8")).replaceAll("\r\n", "\n");
  assert.equal(artifact.type, "artifact");
  assert.equal(artifact.dateLabel, "Efter 1977-04-08");
  assert.equal(artifact.sortDate, "1977-04-08");
  assert.deepEqual(artifact.items.map(i => i.label), ["Framsida", "Baksida"]);
  for (const item of artifact.items) {
    assert.equal(item.transcription, text.split(`## ${item.label}\n`)[1].split(/\n#{1,2} /)[0].trim());
    assert.ok((await readFile(item.image)).length > 0);
  }
  for (const section of artifact.sections) assert.equal(section.content, text.split(`# ${section.title}\n`)[1].split(/\n# /)[0].trim());
  assert.equal(artifact.senderAge, undefined);
  assert.ok(!artifact.metadata.some(field => field.label === "Urbans \u00e5lder"));
  assert.equal(artifact.fromPlace, "Piteå");
});

test("generic heading, numeric image order, more than two images, exact separators", () => {
  const artifact = parse("Datum: 1977\n# Karta\n## Översikt\nÅäö  →\n\n---\n\n  indrag\n## Detalj\nAndra\n# Egen analys\n## Underrubrik\nBevarad analys", ["scan-10.png", "scan-2.png", "scan-1.png"]);
  assert.deepEqual(artifact.items.map(i => i.image), ["scan-1.png", "scan-2.png", "scan-10.png"].map(n => `archive-finds/example/${n}`));
  assert.equal(artifact.items[0].transcription, "Åäö  →\n\n---\n\n  indrag");
  assert.equal(artifact.title, "Karta");
  assert.equal(artifact.sections.at(-1).content, "## Underrubrik\nBevarad analys");
});

test("explicit image links control order independently of filenames", () => {
  const artifact = parse("# Pussel\n## Uppgift\n![Bild](z.jpg)\n\nFråga\n## Lösning\n![Bild](a.jpg)\n\nSvar", ["a.jpg", "z.jpg"]);
  assert.deepEqual(artifact.items.map(i => i.image), ["archive-finds/example/z.jpg", "archive-finds/example/a.jpg"]);
  assert.equal(artifact.items[0].transcription, "Fråga");
  assert.throws(() => parse("# Karta\n## Bild\n![Bild](saknas.jpg)", ["a.jpg"]), /not found/);
});

test("uncertain dates preserve source labels without invented precision", () => {
  for (const [date, sortDate, year] of [["Efter 1977-04-08", "1977-04-08", "1977"], ["1977", "1977", "1977"], ["1977-04", "1977-04", "1977"], ["Okänt", null, null]]) {
    const item = parse(`Datum: ${date}\n# Lapp\nText`);
    assert.equal(item.dateLabel, date);
    assert.equal(item.sortDate, sortDate);
    assert.equal(item.archiveYear, year);
    assert.equal(item.items.length, 0);
    assert.equal(item.sections[0].content, "Text");
  }
});

test("image subsections do not consume adjacent optional analysis", () => {
  const artifact = parse("# Karta\n## Bild\n![Bild](a.jpg)\nText\n# Komplement\nInledning\n## Foto\n![Foto](b.jpg)\nFototext\n## Bedömning\nBevara denna analys", ["a.jpg", "b.jpg"]);
  assert.equal(artifact.sections[0].content, "Inledning\n## Bedömning\nBevara denna analys");
});

test("import appends one object, preserves existing JSON and refuses duplicate ids", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "letterarchive-import-"));
  try {
    const target = path.join(directory, "letters.json");
    const original = await readFile("letters.json", "utf8");
    const baseline = JSON.parse(original);
    baseline.letters = baseline.letters.filter(i => i.type !== "artifact");
    await writeFile(target, JSON.stringify(baseline, null, 2) + "\n");
    await importSource(source, target);
    const imported = JSON.parse(await readFile(target, "utf8"));
    assert.deepEqual(imported.letters.slice(0, -1), baseline.letters);
    assert.deepEqual(imported.collection, baseline.collection);
    await assert.rejects(importSource(source, target), /already exists/);
  } finally {
    await unlink(path.join(directory, "letters.json"));
    await rmdir(directory);
  }
});
