import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { importSource, readSource } from "./archive-import.mjs";

const id = "1977-05-09";
const folder = `letters/1977/${id}/`;
const source = `${folder}letter.md`;
const sha256 = value => createHash("sha256").update(value).digest("hex");

test("1977-05-09 imports the tabbed reader with the original dates and materials", async () => {
  const imported = JSON.parse(JSON.stringify(await readSource(source)));
  const { letters } = JSON.parse(await readFile("letters.json", "utf8"));
  assert.deepEqual(letters.filter(letter => letter.id === id), [imported]);
  assert.equal(imported.date, id);
  assert.equal(imported.writtenDate, "1977-05-07");
  assert.equal(imported.postmarked, id);
  assert.equal(imported.fromPlace, "Stockholm (Esso Motor Hotel, Järva Krog)");
  assert.equal(imported.readerLayout, "continuous");
  assert.deepEqual(imported.items.map(({ type, image }) => [type, image]), [
    ["envelope-front", `${folder}envelope-front.jpg`],
    ["envelope-back", `${folder}envelope-back.jpg`],
    ["page", `${folder}page-01.jpg`]
  ]);
  await Promise.all(imported.items.map(({ image }) => readFile(image)));
  assert.match(imported.items[0].transcription, /Solna 1977-05-09/);
  assert.match(imported.items[2].transcription, /tändsticksask/);
});

test("1977-05-09 preserves the manually reviewed transcription and summary", async () => {
  const markdown = (await readFile(source, "utf8")).replaceAll("\r\n", "\n");
  const blocks = [...markdown.matchAll(/^```text\n([\s\S]*?)\n```$/gm)].map(match => match[1]);
  const imported = await readSource(source);
  // Hashes from the supplied Markdown, with LF line endings for portability.
  assert.deepEqual(blocks.map(sha256), [
    "b6f6e93011980cec8076a4f12716fcc3c1d9c411043ce82da971f6b6b69a6813",
    "27a80502b714cbf3bbf9b161de15e4287ef1df268039e5eac65ef36c8df0afb6",
    "24de3e3d3a957269598429e9d63d53c133d905639221fc35880ca542f367e255"
  ]);
  assert.deepEqual(imported.items.map(item => item.transcription), blocks);
  assert.equal(sha256(imported.summary), "6e1ba2bb54e06aef27a0328362249d856318d315ae875be6ea4e171de875386a");
});

test("replacing 1977-05-09 keeps every other archive entry unchanged", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "letterarchive-1977-05-09-"));
  const target = path.join(directory, "letters.json");
  try {
    const archive = JSON.parse(await readFile("letters.json", "utf8"));
    const index = archive.letters.findIndex(letter => letter.id === id);
    const before = { ...archive, letters: archive.letters.slice() };
    before.letters[index] = { id, date: id };
    await writeFile(target, JSON.stringify(before, null, 2));
    await importSource(source, target, id);
    assert.deepEqual(JSON.parse(await readFile(target, "utf8")), archive);
  } finally {
    await unlink(target).catch(error => { if (error.code !== "ENOENT") throw error; });
    await rmdir(directory);
  }
});
