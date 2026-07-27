# LetterArchive

LetterArchive är ett statiskt, personligt digitalt arkiv för gamla brev. Den
första samlingen heter **Breven till Ulf**. Originalbilderna är arkivets
huvudmaterial; transkriptionerna gör breven läsbara och sökbara utan att ersätta
originalen.

Webbplatsen använder endast HTML, CSS och vanlig JavaScript. Den har inga externa
beroenden, ingen analys eller spårning och kan publiceras direkt med GitHub Pages.

## Projektstruktur

```text
letterarchive/
├── index.html       Sidans semantiska grundstruktur
├── style.css        All formgivning och responsiv layout
├── app.js           Läser data och renderar arkiv- och brevvy
├── letters.json     Metadata, arkivdelar, transkriptioner och beskrivningar
├── README.md
└── letters/
    └── ÅÅÅÅ/
        └── ÅÅÅÅ-MM-DD/
            ├── envelope-front.jpg
            ├── envelope-back.jpg
            ├── page-01.jpg
            └── …
```

## Hur breven lagras

Varje brev har ett objekt i `letters.json`. Där finns datum, avsändare,
mottagare, avsändarens ålder, brevtyp och en ordnad lista `items`. Varje post i
listan är en egen arkivdel: kuvertets framsida, kuvertets baksida eller en
brevsida. Kuverten behandlas alltså som fullvärdiga arkivsidor, inte enbart som
metadata eller miniatyrbilder.

Varje arkivdel kan innehålla:

```json
{
  "type": "envelope-front",
  "label": "Kuvert framsida",
  "image": "letters/1975/1975-05-24/envelope-front.jpg",
  "transcription": "",
  "description": ""
}
```

`type` är `envelope-front`, `envelope-back` eller `page`. Brevsidor har dessutom
ett numeriskt `page`-fält. `transcription` innehåller en ordagrann återgivning
av läsbar text. Stavning, grammatik och äldre uttryck ska inte moderniseras eller
korrigeras. `description` är separat och kan beskriva exempelvis teckningar,
frimärken och dekorationer. Båda fälten är frivilliga och kan lämnas tomma medan
materialet bearbetas.

Ofullständiga demotranskriptioner kan märkas med `transcriptionStatus` och
`transcriptionNote`. Allt innehåll som hör till ett enskilt brev ska ligga i
`letters.json`, inte i HTML- eller JavaScript-filerna.

Bilderna ligger under `letters/<år>/<datum>/`. Datum används i ISO-format:
`ÅÅÅÅ-MM-DD`. Kuvertbilder heter `envelope-front.jpg` och
`envelope-back.jpg`. Brevsidor numreras med två siffror: `page-01.jpg`,
`page-02.jpg` och så vidare.

Sidan visar en tydlig platshållare om en bild ännu inte finns.

## Lägg till ett brev manuellt

1. Skapa en mapp, exempelvis `letters/1976/1976-08-03/`.
2. Lägg originalbilderna i mappen enligt namnkonventionen ovan.
3. Lägg till ett nytt objekt i listan `letters` i `letters.json`.
4. Ange varje kuvertsida och brevsida i `items` i den ordning de ska visas. Ange
   `type`, svensk `label`, sökvägen `image` och, för en brevsida, dess sidnummer
   i `page`.
5. Lägg den ordagranna texten i arkivdelens eget `transcription`-fält. Lägg en
   eventuell förklaring av visuellt material separat i `description`.
6. Kontrollera att `id`, `date` och `folder` stämmer överens och att JSON-filen
   är giltig.

Ett brev kan ha typen `handwritten`, `typewritten` eller `mixed`, vilka visas
som Handskrivet, Maskinskrivet respektive Blandat i gränssnittet.

## Visa webbplatsen lokalt

Eftersom JavaScript läser `letters.json` med `fetch` behöver projektet öppnas
via en lokal webbserver, inte direkt som en `file://`-adress. Ett exempel med
Python är:

```sh
python -m http.server 8000
```

Öppna sedan `http://localhost:8000`.

För GitHub Pages behövs inget byggsteg; publicera filerna från projektets rot.
