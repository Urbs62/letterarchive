const fs = require("fs");
const path = require("path");

const repo = path.resolve(__dirname, "../../..");
const jsonPath = path.join(repo, "letters.json");
const markdownPath = path.join(repo, "letters/1978/1978-07-05/postcard.md");
const markdown = fs.readFileSync(markdownPath, "utf8").replaceAll("\r\n", "\n");
let json = fs.readFileSync(jsonPath, "utf8");
const data = JSON.parse(json);

if (data.letters.some((letter) => letter.id === "1978-07-05")) {
  throw new Error("Försändelsen 1978-07-05 finns redan i letters.json");
}

function topLevelSections(source) {
  const lines = source.split("\n");
  const headings = [];
  lines.forEach((line, index) => {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) headings.push({ title: match[1], line: index });
  });
  return headings.map((heading, index) => ({
    title: heading.title,
    content: lines
      .slice(heading.line + 1, headings[index + 1]?.line ?? lines.length)
      .join("\n")
      .replace(/^---\s*$/gm, "")
      .trim()
  }));
}

const sections = topLevelSections(markdown);
const summarySection = sections.find((section) => section.title === "Sammanfattning");
if (!summarySection) throw new Error("Sammanfattningen saknas i postcard.md");

const entry = {
  id: "1978-07-05",
  date: "1978-07-05",
  from: "Urban",
  to: "Ulf",
  senderAge: 16,
  type: "postcard",
  writingType: "handwritten",
  summary: summarySection.content.replaceAll("**", "").replaceAll("*", ""),
  sections,
  items: [
    {
      type: "front",
      label: "Vykortets framsida",
      image: "letters/1978/1978-07-05/postcard-front.jpg",
      transcription: "HÄLSNING\nFRÅN\nLUND",
      description: "Vykort från Lund med röd bakgrund och motiv av Lunds domkyrka. Till höger finns ett mindre frimärksliknande fotografi med park- och stadsmotiv."
    },
    {
      type: "back",
      label: "Vykortets baksida",
      image: "letters/1978/1978-07-05/postcard-back.jpg",
      transcription: "Hej. 78.07.05\n\nLigger i ett hot.rum i Lund och skr. Hot. het. Aparta. På lör. & sön. ska vi täv. i Kävlinge U.S.M. Lagt. & linje.\n\nHot. är lite simp. Men det dug. åt oss. Nu ska vi och käka. Vi står nu i hiss.\n\nTabben lämnar nu in nyc. Lagt.lag. best. av jag, Bengan o. Tobbe.\n\nVi sta. som 6:e lag.\n\nGick just förbi en kass cykel med två lås. Dessa [oläsligt] Biskopsgatan 5.\n\n[Teckning av tre cyklister]\n\nLagtempo\n\nHejdå.\n\n[Teckning av snöbollar]",
      description: "Vykortets baksida innehåller en teckning av tre cyklister i formation, märkt ”Lagtempo”, samt en teckning som liknar en hög med snöbollar."
    }
  ]
};

const marker = "\n  ]\n}";
const markerIndex = json.lastIndexOf(marker);
if (markerIndex === -1) throw new Error("Kunde inte hitta slutet på letters-listan");
const formattedEntry = JSON.stringify(entry, null, 2)
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n");
json = `${json.slice(0, markerIndex)},\n${formattedEntry}${json.slice(markerIndex)}`;

if (process.argv.includes("--check")) {
  JSON.parse(json);
  console.log(`Kontrollerad: ${entry.items.length} bilder och ${sections.length} toppnivåsektioner`);
  process.exit(0);
}

fs.writeFileSync(jsonPath, json, "utf8");
