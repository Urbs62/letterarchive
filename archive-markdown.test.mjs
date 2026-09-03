import assert from "node:assert/strict";
import test from "node:test";

import { parseArchiveMarkdown } from "./archive-markdown.mjs";

const metadata = `## Date
1975-01-02

## From
Urban

## To
Ulf`;

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
