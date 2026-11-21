import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { discoverSources, importSource, readSource } from "./archive-import.mjs";

const oldId = "1977-04-04";
const id = "1977-06-30";
const folder = `letters/1977/${id}/`;
const source = folder + "letter.md";
const sha256 = value => createHash("sha256").update(value).digest("hex");
const imported = JSON.parse(JSON.stringify(await readSource(source)));
const pages = imported.items.filter(item => item.type === "page");

test("date migration replaces one archive entry and keeps the writing dates", async () => {
  const { letters } = JSON.parse(await readFile("letters.json", "utf8"));
  assert.deepEqual(letters.filter(letter => [id, oldId].includes(letter.id)), [imported]);
  assert.equal(imported.date, id);
  assert.equal(imported.writtenDate, oldId);
  assert.equal(imported.postmarked, "Okänt");
  const note = imported.sections.find(section => section.title === "Arkivnotis").content;
  assert.match(note, /4 april och den 30 juni 1977/);
  assert.match(note, /osäkert om det bevarade kuvertet hör till brevet/);
  const sources = await discoverSources();
  assert.ok(sources.includes(source));
  assert.ok(!sources.includes(`letters/1977/${oldId}/letter.md`));
});

test("all 15 reviewed pages survive byte-for-byte apart from the empty duplicate heading", async () => {
  const markdown = (await readFile(source, "utf8")).replaceAll("\r\n", "\n");
  const blocks = [...markdown.matchAll(/^## Sida (\d+)\n\n### Transcription\n\n```text\n([\s\S]*?)\n```\n\n/gm)];
  const restored = "# Transkription\n\n" + blocks.map(([, number, body]) => `## Sida ${number}\n\n${body}\n\n`).join("");
  assert.equal(sha256(restored.replaceAll("\n", "\r\n")), "ada323c7d2e54eb97b4f32eaff1798a9210671916dd77dfbb47e7c4e58626b19");
  assert.deepEqual(pages.map(page => page.transcription), blocks.map(block => block[2]));
  assert.deepEqual(pages.map(page => page.page), Array.from({ length: 15 }, (_, i) => i + 1));
  assert.deepEqual(pages.map(page => page.image), pages.map(page => `${folder}page-${String(page.page).padStart(2, "0")}.jpg`));
  assert.match(pages[1].transcription, /Ritning över en dominobana/);
  assert.match(pages[3].transcription, /Huru barnet ser saken/);
  assert.match(pages[5].transcription, /\bko\b/i);
  assert.match(pages[13].transcription, /djungelkrocketbana/);
  assert.match(pages[14].transcription, /från föregående sida/);
});

test("all photographs retain their original bytes and the class photo is supplementary", async () => {
  const imageNames = (await readdir(folder)).filter(name => name.endsWith(".jpg")).sort();
  const hashes = {};
  for (const name of imageNames) hashes[name] = sha256(await readFile(folder + name));
  assert.equal(sha256(JSON.stringify(hashes)), "a98fe3497bfcb25880c5295ac40f9ffdc922cc4b140cc6a4e21357ecaabecef0");
  assert.equal(imported.archivePhoto.label, "Klassfoto – årskurs 7");
  assert.equal(imported.archivePhoto.image, folder + "class-photo-grade-7.jpg");
  assert.match(imported.archivePhoto.caption, /sidorna 9–12.*tillförts arkivet i efterhand/);
  assert.deepEqual(imported.items.filter(item => item.type !== "page").map(item => item.type), ["envelope-front"]);
  assert.match(imported.items[0].description, /3,80 kr/);
});

test("importer replaces only the requested entry", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "letterarchive-import-"));
  try {
    const target = path.join(directory, "letters.json");
    const neighbour = { id: "unchanged", summary: "Curated text" };
    await writeFile(target, JSON.stringify({ letters: [{ id: oldId }, neighbour] }, null, 2));
    await importSource(source, target, oldId);
    assert.deepEqual(JSON.parse(await readFile(target, "utf8")).letters, [imported, neighbour]);
    await assert.rejects(importSource(source, target, oldId), /does not exist/);
  } finally {
    await rm(path.join(directory, "letters.json"), { force: true });
    await rmdir(directory);
  }
});
