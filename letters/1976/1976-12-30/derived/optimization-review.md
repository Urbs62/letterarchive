# Bildoptimering

De 32 sidbilderna använder WebP med kvalitet 95, skapade med libwebp 1.5.0
och dess `WebPEncodeBGR`-funktion. Ingen skalning, ytterligare beskärning,
rotation, perspektivkorrigering eller skärpning görs vid komprimeringen.
Varje bild behåller sina tidigare pixelmått och samma synliga innehåll.
De sex samlingsfotografierna och båda kuvertbilderna är oförändrade.

| Alla 32 bilder | Byte | MB (1 MB = 1 000 000 byte) |
|---|---:|---:|
| Tidigare PNG | 109 855 840 | 109,86 |
| WebP kvalitet 95 | 16 620 484 | 16,62 |
| Minskning | 93 235 356 | 84,87 % |

Bredderna är fortsatt 1330–1900 pixlar och höjderna 1150–1670 pixlar.
Varje enskild bilds exakta dimensioner motsvarar dess `rect` i manifestet.

## Kvalitetsval

Kvalitet 85, 90 och 95 jämfördes på sidorna 17, 22, 23, 24 och 32:
tät och svag handstil, tunna blå pennstreck, snökojeritningen,
pappersflygplanet, tejp, nödfallspaketet och papperskanter.

| Kvalitet | Sammanlagda byte för dessa fem provbilder |
|---|---:|
| 85 | 1 043 210 |
| 90 | 1 656 402 |
| 95 | 2 740 854 |

Provbilderna granskades sida vid sida i 100 % och i utvalda utsnitt i 200 %.
Kvalitet 85 och 90 slätar ut mer av papperets struktur. Kvalitet 95 ligger
visuellt nära PNG-bilderna; ingen märkbar försämring av tecknens läsbarhet,
teckningar eller föremålsdetaljer observerades. Komprimeringen är ändå
förlustbringande och bilderna är inte pixelidentiska med PNG-versionerna.
Förlustfri WebP behövdes därför inte som ersättning för den valda kvaliteten.

Alla 32 filer har också jämförts numeriskt med PNG-versionerna. PSNR ligger
mellan 43,31 och 45,05 dB. Dessa mätvärden kompletterar den visuella
granskningen; de ersätter den inte. Kontrollsummor, filstorlekar, ursprungliga
PNG-kontrollsummor och mätvärden finns i `manifest.json`.

## Återskapa och verifiera

Kör från projektroten:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File letters/1976/1976-12-30/derived/generate.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File letters/1976/1976-12-30/derived/generate.ps1 -Verify
```

Skriptet använder de orörda originalfotografierna och samma utsnittskoordinater
som tidigare. `-Verify` återskapar kodningen i minnet och jämför resultatet
utan att skriva över bilderna. Libwebp-versionen och de förväntade
kontrollsummorna kontrolleras för reproducerbara resultat.

Standardbiblioteket är det lokalt installerade GIMP 3-biblioteket
`%LOCALAPPDATA%\Programs\GIMP 3\bin\libwebp-7.dll`.
En annan installation av libwebp 1.5.0 kan anges med `-WebPLibraryPath`
eller miljövariabeln `LETTERARCHIVE_WEBP_LIBRARY`. DLL-filen ingår inte
i arkivet och behövs bara för återskapning, inte för webbplatsens visning.
