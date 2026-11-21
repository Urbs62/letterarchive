import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArchiveMarkdown } from "./archive-markdown.mjs";

export async function discoverSources(root = ".") {
  const sources = [];
  async function visit(directory) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const source = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(source);
      else if (/^(letter|postcard|artifact)\.md$/i.test(entry.name)) sources.push(source.replaceAll("\\", "/"));
    }
  }
  await visit(path.join(root, "letters"));
  await visit(path.join(root, "archive-finds"));
  return sources.sort();
}

export async function readSource(source) {
  const directory = path.dirname(source);
  const names = await readdir(directory);
  let attachments = [];
  try { attachments = (await readdir(path.join(directory, "attachments"))).filter(n => /^attachment-\d+/i.test(n)).sort().map(n => `attachments/${n}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  return parseArchiveMarkdown(await readFile(source, "utf8"), {
    fileName: source, folder: `${directory.replaceAll("\\", "/")}/`,
    documentImages: names.filter(n => /\.(jpe?g|png|webp|gif)$/i.test(n)), attachmentImages: attachments
  });
}

export async function importSource(source, target = "letters.json", replaceId) {
  const entry = await readSource(source);
  if (!entry.id) throw new Error("Missing archive object id");
  const original = await readFile(target, "utf8");
  const archive = JSON.parse(original);
  const replaceIndex = replaceId ? archive.letters.findIndex(item => item.id === replaceId) : -1;
  if (replaceId && replaceIndex < 0) throw new Error(`Object to replace does not exist: ${replaceId}`);
  if (archive.letters.some((item, index) => index !== replaceIndex && item.id === entry.id)) {
    throw new Error(`Object already exists: ${entry.id}; review updates manually`);
  }
  for (const item of entry.items) await readFile(item.image);
  if (entry.archivePhoto) await readFile(entry.archivePhoto.image);
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const serialize = item => JSON.stringify(item, null, 2).split("\n").map(line => `    ${line}`).join(eol);
  const expected = archive.letters.slice();
  let output;
  if (replaceId) {
    const previous = serialize(expected[replaceIndex]);
    const start = original.indexOf(previous);
    if (start < 0) throw new Error(`Unexpected JSON formatting for ${replaceId}`);
    output = original.slice(0, start) + serialize(entry) + original.slice(start + previous.length);
    expected[replaceIndex] = entry;
  } else {
    // Append without reserializing existing objects.
    const closing = /\s*\]\s*}\s*$/.exec(original);
    if (!closing) throw new Error("Expected letters to be the last array in archive JSON");
    output = original.slice(0, closing.index) + (archive.letters.length ? "," : "") + eol + serialize(entry) + closing[0];
    expected.push(entry);
  }
  const checked = JSON.parse(output);
  if (JSON.stringify(checked.letters) !== JSON.stringify(expected)) throw new Error("Unexpected archive changes");
  await writeFile(target, output, "utf8");
  return entry;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command, source, replaceId] = process.argv.slice(2);
  if (command === "--list") console.log((await discoverSources()).join("\n"));
  else if (command === "--write" && source) console.log(`Imported ${(await importSource(source)).id}`);
  else if (command === "--replace" && source && replaceId) console.log(`Imported ${(await importSource(source, "letters.json", replaceId)).id}`);
  else throw new Error("Usage: node archive-import.mjs --list | --write <source.md> | --replace <source.md> <old-id>");
}
