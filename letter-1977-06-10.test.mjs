import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSource } from "./archive-import.mjs";

const id = "1977-06-10";
const folder = `letters/1977/${id}/`;
const sha256 = value => createHash("sha256").update(value).digest("hex");

test("1977-06-10 imports one letter page and preserves the complete source", async () => {
  const source = folder + "letter.md";
  const imported = JSON.parse(JSON.stringify(await readSource(source)));
  const { letters } = JSON.parse(await readFile("letters.json", "utf8"));
  assert.deepEqual(letters.filter(letter => letter.id === id), [imported]);
  assert.equal(imported.date, id);
  assert.equal(imported.writtenDate, "1977-06-06");
  assert.equal(imported.postmarked, id);
  assert.equal(imported.fromPlace, "Piteå");
  assert.equal(imported.readerLayout, "continuous");
  assert.deepEqual(imported.items.map(({ type, image }) => [type, image]), [
    ["envelope-front", folder + "envelope-front.jpg"],
    ["envelope-back", folder + "envelope-back.jpg"],
    ["page", folder + "page-01.jpg"]
  ]);
  assert.equal(imported.items[2].page, 1);
  assert.match(imported.items[0].description, /1,10 kr.*Piteå.*10\.6\.77/);
  await Promise.all(imported.items.map(({ image }) => readFile(image)));

  // Fingerprints of the supplied text with LF line endings for portability.
  const markdown = (await readFile(source, "utf8")).replaceAll("\r\n", "\n");
  const blocks = [...markdown.matchAll(/^\x60{3}text\n([\s\S]*?)\n\x60{3}$/gm)].map(match => match[1]);
  assert.deepEqual(imported.items.map(item => item.transcription), blocks);
  assert.deepEqual(blocks.map(sha256), [
    "8e714bc09c41d0768fef78326d26418c0555328e266ce3ed6674ca1b999a6992",
    "11c8da6af4e5d1ff18425e0fe62da18d1a961ee2deb0cd3a442237e19ebce563",
    "9476dc8f815edae67e65518c5d0cfdcd4c56a83612f64f2589082e98be434ab0"
  ]);
  assert.deepEqual(imported.items.map(item => sha256(item.description)), [
    "6a8bfb9447ed8b7a9e14ce9fa78e690c2160fc271f4665f6c90107bd62c07c97",
    "5755ae630700749b8f07a31bf20a62548b304a20a7d7c5f80cf22cc8a0ae39de",
    "f0f3e7e16379bf22bc0d8d2dda97a4e549b63e6f0dea25d38cd86588dda9025d"
  ]);
  assert.equal(sha256(imported.summary), "b57b753bc28aa9b37e7c902cd08cbb611e706e9408403e7ffd807f4e43f5e4b4");
});
