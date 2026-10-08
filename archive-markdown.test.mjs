import assert from "node:assert/strict";
import test from "node:test";

import { parseArchiveMarkdown } from "./archive-markdown.mjs";
import { readSource } from "./archive-import.mjs";
import { readFile } from "node:fs/promises";

test("1975-08-27 matches Markdown, including four reviewed page blocks", async () => {
  const source = "letters/1975/1975-08-27/letter.md";
  const parsed = await readSource(source);
  const stored = JSON.parse(await readFile("letters.json", "utf8")).letters.find(l => l.id === "1975-08-27");
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), stored);
  const md = (await readFile(source, "utf8")).replaceAll("\r\n", "\n");
  const blocks = [...md.matchAll(/```text\n([\s\S]*?)\n```/g)].map(m => m[1]);
  assert.equal(blocks.length, 4);
  assert.deepEqual(stored.items.filter(i => i.type === "page").map(i => i.transcription), blocks);
  assert.deepEqual(stored.items.map(i => i.type), ["envelope-front", "envelope-back", "page", "page", "page", "page"]);
  assert.equal(stored.writtenDate, "1975-08-16");
  assert.equal(stored.date, "1975-08-27");
  assert.equal(stored.sections.find(s => s.title === "Iakttagelser").content.split(/\n- /).length, 3);
  assert.equal(stored.sections.find(s => s.title === "Djur").content, "- Frasse – Urbans familjs katt; central i brevet.");
});

test("1975-07-22 imports reviewed diary text, illustrations and concise aftertext", async () => {
  const source = "letters/1975/1975-07-22/letter.md";
  const parsed = await readSource(source);
  const stored = JSON.parse(await readFile("letters.json", "utf8")).letters.find(l => l.id === "1975-07-22");
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), stored);
  assert.deepEqual(stored.items.map(i => i.type), ["envelope-front", "envelope-back", "page", "page"]);
  const md = (await readFile(source, "utf8")).replaceAll("\r\n", "\n");
  const texts = [...md.matchAll(/```text\n([\s\S]*?)\n```/g)].map(m => m[1]);
  const pages = stored.items.filter(i => i.type === "page");
  assert.deepEqual(pages.map(i => i.transcription), texts);
  assert(pages[1].transcription.includes("Klockan är nu 22.30. Natt! \n"));
  assert(pages[1].transcription.includes("7 a) Hårdkokt ägg.\n   b) Löskokt ägg."));
  assert(pages[1].transcription.endsWith("P.S.\nTjing."));
  assert(pages[0].description.includes('1. (Ingen teckning – förklaras på nästa sida som "Fluga, levande".)'));
  assert(pages[1].description.includes("7a. Hårdkokt ägg.\n7b. Löskokt ägg."));
  assert.equal(stored.senderAge, 12);
  assert.equal(stored.postmarked, "1975-07-22");
  assert(stored.summary.length < 250);
  assert.equal(stored.sections.find(s => s.title === "Iakttagelser").content.split("\n").length, 3);
});

for (const id of ["1974-02-12", "1974-02-19"]) {
test(`SPECIAL ${id} source preserves the reviewed page text and aftertext`, async () => {
  const parsed = await readSource(`letters/1974/${id}/letter.md`);
  const stored = JSON.parse(await readFile("letters.json", "utf8")).letters.find(letter => letter.id === id);
  const pages = letter => letter.items.filter(item => item.type === "page");
  assert.deepEqual(pages(parsed).map(item => item.transcription), pages(stored).map(item => item.transcription));
  assert.deepEqual(pages(parsed).map(item => [item.label, item.image]), pages(stored).map(item => [item.label, item.image]));
  assert.equal(parsed.summary, stored.summary);
  // The stored entry is curated: compare analysis without reimporting legacy
  // envelope/summary structural sections from the source.
  assert.deepEqual(parsed.sections.filter(section => stored.sections.some(existing => existing.title === section.title)), stored.sections);
  assert.deepEqual(parsed.items.map(item => item.type), ["envelope-front", "envelope-back", "page", "page"]);
});
}

test("1978-09-29 keeps one logical transcription across two physical originals", async () => {
  const parsed = await readSource("letters/1978/1978-09-29/letter.md");
  const stored = JSON.parse(await readFile("letters.json", "utf8")).letters.find(letter => letter.id === "1978-09-29");
  const pages = stored.items.filter(item => item.type === "page");
  assert.equal(pages.length, 2);
  assert.equal(pages[0].transcription, parsed.items.find(item => item.type === "page").transcription);
  assert.equal(pages[1].transcription, "");
  assert.deepEqual(pages.map(item => item.image), ["page-01.jpeg", "page-02.jpeg"].map(name => stored.folder + name));
  assert.equal(stored.items.filter(item => item.type === "attachment").length, 3);
  assert.equal(stored.summary, parsed.summary);
  assert.deepEqual(stored.sections, parsed.sections.filter(section => ["Iakttagelser", "Personer"].includes(section.title)));
  const observations = stored.sections[0].content, people = stored.sections[1].content;
  assert.ok(observations.includes("29.3.78") && observations.includes("1978-09-29") && observations.includes("förklarar inte säkert"));
  assert.ok(!observations.includes("Urban har kanske"));
  assert.equal((people.match(/^- Birgitta S /gm) || []).length, 1);
  assert.equal((people.match(/^- Birgitta J /gm) || []).length, 1);
  assert.ok(!/Nirgitta|Bigitta|TOrbjörn/.test(people));
});

test("1974-03-05 retains legacy drawing material and uses concise aftertext", async () => {
  const source = await readFile("letters/1974/1974-03-05/letter.md", "utf8");
  const parsed = parseArchiveMarkdown(source, {fileName: "letter.md"});
  const stored = JSON.parse(await readFile("letters.json", "utf8")).letters.find(letter => letter.id === "1974-03-05");
  assert.equal(parsed.summary, stored.summary);
  assert.deepEqual(parsed.sections.filter(section => ["Iakttagelser", "Personer"].includes(section.title)), stored.sections);
  const pages = stored.items.filter(item => item.type === "page");
  const first = source.split("## Sida 1")[1].split("### Teckning")[0].trim();
  const drawing = source.split("### Teckning")[1].split("## Sida 2")[0].trim();
  const story = source.split("### Historia")[1].split("# Sammanfattning")[0].trim();
  assert.equal(pages[0].transcription, first);
  assert.equal(pages[0].description, drawing);
  assert.equal(pages[1].transcription, "Historia\n\n" + story);
  assert.equal(stored.sections[0].content.split("\n\n").length, 5);
  assert.equal(stored.sections[1].content.split("\n").length, 5);
  assert.ok(stored.summary.length < 300);
  assert.ok(!stored.sections.some(section => section.title === "Platser"));
});

test("1974-08-23 uses reviewed legacy source pages and concise analysis", async () => {
  const source = await readFile("letters/1974/1974-08-23/letter.md", "utf8");
  const archive = JSON.parse(await readFile("letters.json", "utf8"));
  const stored = archive.letters.find(letter => letter.id === "1974-08-23");
  for (const page of stored.items.filter(item => item.type === "page")) {
    const block = source.split(`# Page ${page.page}`)[1].split(/^# /m)[0];
    assert.equal(page.transcription, block.split("## Transkription")[1].replace(/\r\n/g, "\n").replace(/\n---\s*$/, "").trim());
  }
  const parsed = parseArchiveMarkdown(source, {fileName: "letter.md"});
  assert.equal(parsed.summary, stored.summary);
  assert.deepEqual(parsed.sections.filter(section => ["Iakttagelser", "Personer"].includes(section.title)), stored.sections);
  assert.deepEqual(stored.items.map(item => item.type), ["envelope-front", "envelope-back", "page", "page", "page", "attachment", "attachment", "attachment"]);
  assert.equal(archive.letters.filter(letter => letter.type === "artifact" && /agfamatic/i.test(JSON.stringify(letter))).length, 1);
  assert.ok(stored.summary.length < 300);
  assert.ok(stored.sections[0].content.includes("Avvikelsen är olöst"));
});

test("1975-05-29 imports reviewed lines, PS text and all existing analysis", async () => {
  const parsed = await readSource("letters/1975/1975-05-29/letter.md");
  const stored = JSON.parse(await readFile("letters.json", "utf8")).letters.find(letter => letter.id === "1975-05-29");
  assert.deepEqual(stored.items, parsed.items);
  assert.equal(stored.summary, parsed.summary);
  assert.deepEqual(stored.sections, parsed.sections.filter(section => ["Iakttagelser", "Personer", "Djur"].includes(section.title)));
  assert.ok(stored.summary.length < 300);
  assert.equal(stored.sections[0].content.split("\n\n").length, 5);
  assert.equal(stored.sections[1].content.split("\n").length, 5);
  assert.ok(stored.sections[2].content.includes("Frasse"));
});

const metadata = `## Date
1975-01-02

## From
Urban

## To
Ulf`;

test("uses postmark for identity while preserving writing date and explicit id", () => {
  const source = "Datum: 1981-02-03\nPoststämplat: 1981-02-09";
  const options = { fileName: "letter.md" };
  assert.equal(parseArchiveMarkdown(source, options).id, "1981-02-09");
  assert.equal(parseArchiveMarkdown(source, options).date, "1981-02-09");
  assert.equal(parseArchiveMarkdown(source, options).writtenDate, "1981-02-03");
  assert.equal(parseArchiveMarkdown(source, { ...options, id: "custom" }).id, "custom");
  assert.equal(parseArchiveMarkdown("Datum: 1981-02-03", options).id, "1981-02-03");
});

test("imports notepad covers separately from envelope and preserves page order", () => {
  for (const [heading, front, back] of [
    ["Anteckningsblock", "Framsida", "Baksida"],
    ["Notepad", "Front", "Back"]
  ]) {
    const letter = parseArchiveMarkdown(`# Kuvert
## Framsida
Kuverttext
# ${heading}
## ${front}
Omslag fram
## ${back}
Omslag bak
## Sida 2
Andra sidan
## Sida 1
Första sidan`, {
      fileName: "letter.md", folder: "letters/example/",
      documentImages: ["notepad-front.jpeg", "notepad-back.jpg"]
    });
    assert.deepEqual(letter.items.map(({ type }) => type),
      ["envelope-front", "attachment", "attachment", "page", "page"]);
    assert.deepEqual(letter.items.map(({ transcription }) => transcription),
      ["Kuverttext", "Omslag fram", "Omslag bak", "Andra sidan", "Första sidan"]);
    assert.equal(letter.items[1].image, "letters/example/notepad-front.jpeg");
    assert.equal(letter.items[2].image, "letters/example/notepad-back.jpg");
    assert.deepEqual(letter.items.filter(item => item.type === "page").map(item => item.page), [2, 1]);
  }
});

function parse(markdown) {
  return parseArchiveMarkdown(`${metadata}\n\n${markdown}`, {
    fileName: "letter.md",
    folder: "letters/1975/1975-01-02/"
  });
}

test("parses a legacy English envelope with front and back", () => {
  const letter = parse(`# Envelope

## Front

### Transcription
Front text

### Description
Front description

## Back

Back text

# Letter

## Page 1

Page text`);

  assert.deepEqual(letter.items.map(({ type }) => type), [
    "envelope-front",
    "envelope-back",
    "page"
  ]);
  assert.equal(letter.items[0].transcription, "Front text");
  assert.equal(letter.items[0].description, "Front description");
  assert.equal(letter.items[1].transcription, "Back text");
});

test("parses Swedish front and back aliases", () => {
  const letter = parse(`# Kuvert

## Framsida

Framsidestext

## Baksida

Baksidestext`);

  assert.deepEqual(letter.items.map(({ type }) => type), [
    "envelope-front",
    "envelope-back"
  ]);
  assert.equal(letter.items[0].transcription, "Framsidestext");
  assert.equal(letter.items[1].transcription, "Baksidestext");
});

test("adds an optional Swedish inside in envelope order", () => {
  const letter = parse(`# Kuvert

## Framsida

Fram

## Baksida

Bak

## Insida

### Transcription
Insidestext

### Description
Inside description

# Brev

## Page 2

Andra sidan

## Page 1

Första sidan`);

  assert.deepEqual(letter.items.map(({ type }) => type), [
    "envelope-front",
    "envelope-back",
    "envelope-inside",
    "page",
    "page"
  ]);
  assert.deepEqual(letter.items[2], {
    type: "envelope-inside",
    label: "Kuvert insida",
    image: "letters/1975/1975-01-02/envelope-inside.jpg",
    transcription: "Insidestext",
    description: "Inside description"
  });
});

test("does not count envelope-inside as a page or attachment", () => {
  const letter = parse(`# Kuvert

## Framsida
Fram

## Baksida
Bak

## Insida
Inuti

# Brev

## Page 1
Sida`);
  letter.items.push({ type: "attachment", label: "Bilaga" });

  assert.equal(letter.items.filter((item) => item.type === "page").length, 1);
  assert.equal(letter.items.filter((item) => item.type === "attachment").length, 1);
});

test("omits envelope-inside when no inside heading exists", () => {
  const letter = parse(`# Kuvert

## Framsida
Fram

## Baksida
Bak`);

  assert.equal(letter.items.some((item) => item.type === "envelope-inside"), false);
});

test("parses the Swedish finished-letter format", () => {
  const letter = parseArchiveMarkdown(`Datum: 1978-08-24
Poststämplat: 1978-08-24
Typ: Brev
Avsändare: Urban Sandlund
Mottagare: Ulf Sandlund
Urbans ålder: 15 år
Från: Piteå
Till: Mölndal

# Kuvert
## Framsida
**Transkription:**

Framtext

**Beskrivning:**

Frambeskrivning

# Brev
## Sida 1
**Transkription:**

Sidtext

# Bilagor
## Bilaga 1
**Beskrivning:**

Bilagebeskrivning

# Sammanfattning
En sammanfattning.`, {
    fileName: "letter.md",
    folder: "letters/1978/1978-08-24/",
    attachmentImages: ["attachments/attachment-01-labyrinth.jpg"]
  });

  assert.equal(letter.id, "1978-08-24");
  assert.equal(letter.from, "Urban Sandlund");
  assert.equal(letter.to, "Ulf Sandlund");
  assert.equal(letter.senderAge, 15);
  assert.equal(letter.postmarked, "1978-08-24");
  assert.equal(letter.fromPlace, "Piteå");
  assert.equal(letter.toPlace, "Mölndal");
  assert.deepEqual(letter.items.map(({ type }) => type), ["envelope-front", "page", "attachment"]);
  assert.equal(letter.items[0].transcription, "Framtext");
  assert.equal(letter.items[0].description, "Frambeskrivning");
  assert.equal(letter.items[1].transcription, "Sidtext");
  assert.equal(letter.items[2].image, "letters/1978/1978-08-24/attachments/attachment-01-labyrinth.jpg");
  assert.equal(letter.items[2].description, "Bilagebeskrivning");
});

test("parses a Swedish postcard with list metadata and a numbered transcription", () => {
  const postcard = parseArchiveMarkdown(`# Metadata

- Datum: 1976-08-18
- Poststämplat: 1976-08-18
- Typ: Vykort
- Avsändare: Urban Sandlund
- Mottagare: Ulf Sandlund
- Avsändarens ålder: 13 år
- Från: Piteå
- Till: Mölndal

# Vykort
## Framsida
Framsidesbeskrivning

## Baksida
Baksidesbeskrivning

# Transkription
## Sida 1
Vykortstext`, {
    fileName: "postcard.md",
    folder: "letters/1976/1976-08-18/"
  });

  assert.equal(postcard.id, "1976-08-18");
  assert.equal(postcard.from, "Urban Sandlund");
  assert.equal(postcard.to, "Ulf Sandlund");
  assert.equal(postcard.senderAge, 13);
  assert.equal(postcard.postmarked, "1976-08-18");
  assert.equal(postcard.fromPlace, "Piteå");
  assert.equal(postcard.toPlace, "Mölndal");
  assert.equal(postcard.type, "postcard");
  assert.equal(postcard.sections.some(({ title }) => title === "Metadata"), false);
  assert.equal(postcard.items[0].description, "Framsidesbeskrivning");
  assert.equal(postcard.items[1].description, "Baksidesbeskrivning");
  assert.equal(postcard.items[1].transcription, "Vykortstext");
});

test("keeps an explicitly labelled transcription under a Swedish postcard back", () => {
  const postcard = parseArchiveMarkdown(`# Metadata

- Datum: 1978-12-01
- Typ: Vykort

# Vykort
## Framsida
**Beskrivning:**

Framsidesbild

## Baksida
**Transkription:**

Vykortstext`, {
    fileName: "postcard.md",
    folder: "letters/1978/1978-12-xx/"
  });

  assert.equal(postcard.items[0].description, "Framsidesbild");
  assert.equal(postcard.items[1].transcription, "Vykortstext");
  assert.equal(postcard.items[1].description, "");
});

test("keeps legacy metadata before the first heading working", () => {
  const letter = parseArchiveMarkdown(`Datum: 1977-01-18
Poststämplat: 1977-01-18
Typ: Brev
Avsändare: Urban Sandlund
Mottagare: Ulf Sandlund
Urbans ålder: 14 år

# Sammanfattning
Äldre format.`, {
    fileName: "letter.md",
    folder: "letters/1977/1977-01-18/"
  });

  assert.equal(letter.date, "1977-01-18");
  assert.equal(letter.postmarked, "1977-01-18");
  assert.equal(letter.from, "Urban Sandlund");
  assert.equal(letter.to, "Ulf Sandlund");
  assert.equal(letter.senderAge, 14);
  assert.deepEqual(letter.sections.map(({ title }) => title), ["Sammanfattning"]);
});

test("uses the postmark as the main date and preserves a different writing date", () => {
  const letter = parseArchiveMarkdown(`Datum: 1979-04-10
Poststämplat: 1979-04-30
Typ: Brev
Avsändare: Urban Sandlund
Mottagare: Ulf Sandlund`, {
    fileName: "letter.md",
    folder: "letters/1979/1979-04-30/"
  });

  assert.equal(letter.id, "1979-04-30");
  assert.equal(letter.date, "1979-04-30");
  assert.equal(letter.writtenDate, "1979-04-10");
  assert.equal(letter.postmarked, "1979-04-30");
});

test("uses discovered JPEG filenames for letter envelopes and pages", () => {
  const letter = parseArchiveMarkdown(`${metadata}

# Envelope
## Front
Front
## Back
Back
# Letter
## Page 1
First page
## Page 2
Second page`, {
    fileName: "letter.md",
    folder: "letters/1980/1980-03-11/",
    documentImages: [
      "envelope-front.jpeg",
      "envelope-back.jpeg",
      "page-01.jpeg",
      "page-02.jpeg"
    ]
  });

  assert.deepEqual(letter.items.map(({ image }) => image), [
    "letters/1980/1980-03-11/envelope-front.jpeg",
    "letters/1980/1980-03-11/envelope-back.jpeg",
    "letters/1980/1980-03-11/page-01.jpeg",
    "letters/1980/1980-03-11/page-02.jpeg"
  ]);
});

 test("preserves positioned text inside an existing fenced transcription", () => {
 const text = "                                   8/12-72\n\n                         HEJ!\n\nProse line\nnext line.\n\n                      Hälsningar\n                    Urban Sandlund";
 const letter = parse("# Letter\n\n## Page 1\n\n### Transcription\n\n" + "```text\n" + text + "\n```");
 assert.equal(letter.items[0].transcription, text);
 });
