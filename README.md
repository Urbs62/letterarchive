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
├── letters.json     Metadata, bildordning och transkriptioner
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
mottagare, avsändarens ålder, brevtyp, mappsökväg, bilder i rätt ordning och
transkriptioner sida för sida. Allt innehåll som hör till ett enskilt brev ska
ligga där, inte i HTML- eller JavaScript-filerna.

Bilderna ligger under `letters/<år>/<datum>/`. Datum används i ISO-format:
`ÅÅÅÅ-MM-DD`. Kuvertbilder heter `envelope-front.jpg` och
`envelope-back.jpg`. Brevsidor numreras med två siffror: `page-01.jpg`,
`page-02.jpg` och så vidare.

Sidan visar en tydlig platshållare om en bild ännu inte finns.

## Lägg till ett brev manuellt

1. Skapa en mapp, exempelvis `letters/1976/1976-08-03/`.
2. Lägg originalbilderna i mappen enligt namnkonventionen ovan.
3. Lägg till ett nytt objekt i listan `letters` i `letters.json`.
4. Ange varje bild i `images` i den ordning den ska visas. Sätt `kind` till
   `envelope` eller `page`; för en brevsida anges också dess sidnummer i `page`.
5. Lägg transkriberad text i `transcription.pages`, ett objekt per
   transkriberad sida. Behåll originalets språk och stavning.
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
