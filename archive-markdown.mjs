import path from "node:path";
import { fileURLToPath } from "node:url";

const DOCUMENT_FILES = {
  "letter.md": "letter",
  "postcard.md": "postcard"
};

function section(markdown, heading, level = "#{1,3}") {
  const lines = markdown.split(/\r?\n/);
  const allowedLevel = new RegExp(`^(${level})\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
  const start = lines.findIndex((line) => allowedLevel.test(line));
  if (start < 0) return "";
  const headingLevel = lines[start].match(/^#+/)[0].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const nextHeading = lines[index].match(/^(#+)\s+/);
    if (nextHeading && nextHeading[1].length <= headingLevel) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n").replace(/^---\s*$/gm, "").trim();
}

function field(markdown, name) {
  return section(markdown, name, "##");
}

function itemContent(markdown, heading) {
  const block = section(markdown, heading);
  return {
    transcription: section(block, "Transcription", "###") || block.replace(/^###\s+.*$/gim, "").trim(),
    description: section(block, "Description", "###")
  };
}

function parseLetter(markdown, folder) {
  const items = [];
  const envelope = section(markdown, "Envelope", "#");
  for (const [heading, type, label, image] of [
    ["Front", "envelope-front", "Kuvert framsida", "envelope-front.jpg"],
    ["Back", "envelope-back", "Kuvert baksida", "envelope-back.jpg"]
  ]) {
    if (section(envelope, heading, "##")) {
      items.push({ type, label, image: `${folder}${image}`, ...itemContent(envelope, heading) });
    }
  }

  const pagePattern = /^##\s+Page\s+(\d+)\s*$/gim;
  for (const match of markdown.matchAll(pagePattern)) {
    const page = Number(match[1]);
    items.push({
      type: "page",
      page,
      label: `Sida ${page}`,
      image: `${folder}page-${String(page).padStart(2, "0")}.jpg`,
      ...itemContent(markdown, `Page ${page}`)
    });
  }
  return items;
}

function parsePostcard(markdown, folder) {
  const front = itemContent(markdown, "Front");
  const back = itemContent(markdown, "Back");
  const transcription = section(markdown, "Transcription", "#");
  return [
    {
      type: "front",
      label: "Front",
      image: `${folder}postcard-front.jpg`,
      transcription: front.transcription,
      description: front.description
    },
    {
      type: "back",
      label: "Back",
      image: `${folder}postcard-back.jpg`,
      transcription: transcription || back.transcription,
      description: back.description
    }
  ];
}

/** Parse either a legacy letter.md or a postcard.md into the JSON data shape. */
export function parseArchiveMarkdown(markdown, { fileName, folder = "", id } = {}) {
  const type = DOCUMENT_FILES[path.basename(fileName || "").toLowerCase()];
  if (!type) throw new Error("Expected a file named letter.md or postcard.md");

  const date = field(markdown, "Date");
  return {
    id: id || date,
    date,
    from: field(markdown, "From"),
    to: field(markdown, "To"),
    senderAge: Number(field(markdown, "Sender Age")) || undefined,
    type,
    writingType: field(markdown, "Writing Type") || undefined,
    folder,
    summary: section(markdown, "Summary", "#") || section(markdown, "Sammanfattning", "#"),
    items: type === "postcard" ? parsePostcard(markdown, folder) : parseLetter(markdown, folder)
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { readFile } = await import("node:fs/promises");
  const sourcePath = process.argv[2];
  if (!sourcePath) throw new Error("Usage: node archive-markdown.mjs <letter.md|postcard.md>");
  const markdown = await readFile(sourcePath, "utf8");
  const folder = `${path.dirname(sourcePath).replaceAll("\\", "/")}/`;
  console.log(JSON.stringify(parseArchiveMarkdown(markdown, { fileName: sourcePath, folder }), null, 2));
}
