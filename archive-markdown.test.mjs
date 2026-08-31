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
