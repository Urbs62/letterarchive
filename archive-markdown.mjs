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

function lineField(markdown, names) {
  for (const name of names) {
    const match = markdown.match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, "im"));
    if (match) return match[1].trim();
  }
  return "";
}

function metadataField(markdown, englishName, lineNames = []) {
  return field(markdown, englishName) || lineField(markdown, lineNames);
}

function itemContent(markdown, heading) {
  const block = section(markdown, heading);
  const labelled = (names) => {
    const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const match = block.match(new RegExp(
      `\\*\\*(?:${escaped}):?\\*\\*\\s*\\n+([\\s\\S]*?)(?=\\n+\\*\\*[^\\n]+:?\\*\\*|$)`,
      "i"
    ));
    return match?.[1].trim() || "";
  };
  const transcription = section(block, "Transcription", "###") || labelled(["Transkription", "Transcription"]);
  const description = section(block, "Description", "###") || labelled(["Beskrivning", "Description"]);
  return {
    transcription: transcription || (description ? "" : block.replace(/^###\s+.*$/gim, "").trim()),
    description
  };
}

function aliasedSection(markdown, headings, level) {
  for (const heading of headings) {
    const headingPattern = new RegExp(
      `^${level}\\s+${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*$`,
      "im"
    );
    if (headingPattern.test(markdown)) {
      return { heading, content: section(markdown, heading, level) };
    }
  }
  return undefined;
}

/** Collect every level-one Markdown section without knowing its title. */
function topLevelSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headings = [];

  lines.forEach((line, index) => {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) headings.push({ title: match[1], line: index });
  });

  return headings.map((heading, index) => {
    const end = headings[index + 1]?.line ?? lines.length;
    const content = lines
      .slice(heading.line + 1, end)
      .join("\n")
      .replace(/^---\s*$/gm, "")
      .trim();
    return { title: heading.title, content };
  });
}

function parseLetter(markdown, folder, attachmentImages = []) {
  const items = [];
  const envelopeSection = aliasedSection(markdown, ["Envelope", "Kuvert"], "#");
  const envelopeItems = [
    {
      headings: ["Front", "Framsida"],
      type: "envelope-front",
      label: "Kuvert framsida",
      image: "envelope-front.jpg"
    },
    {
      headings: ["Back", "Baksida"],
      type: "envelope-back",
      label: "Kuvert baksida",
      image: "envelope-back.jpg"
    },
    {
      headings: ["Inside", "Insida"],
      type: "envelope-inside",
      label: "Kuvert insida",
      image: "envelope-inside.jpg"
    }
  ];

  if (envelopeSection) {
    for (const { headings, type, label, image } of envelopeItems) {
      const itemSection = aliasedSection(envelopeSection.content, headings, "##");
      if (itemSection) {
        items.push({
          type,
          label,
          image: `${folder}${image}`,
          ...itemContent(envelopeSection.content, itemSection.heading)
        });
      }
    }
  }

  const pagePattern = /^##\s+(?:Page|Sida)\s+(\d+)\s*$/gim;
  for (const match of markdown.matchAll(pagePattern)) {
    const page = Number(match[1]);
    items.push({
      type: "page",
      page,
      label: `Sida ${page}`,
      image: `${folder}page-${String(page).padStart(2, "0")}.jpg`,
      ...itemContent(markdown, match[0].replace(/^##\s+/, "").trim())
    });
  }

  const attachmentPattern = /^##\s+(?:Attachment|Bilaga)\s+(\d+)\s*$/gim;
  for (const match of markdown.matchAll(attachmentPattern)) {
    const number = Number(match[1]);
    const defaultImage = `attachments/attachment-${String(number).padStart(2, "0")}.jpg`;
    items.push({
      type: "attachment",
      label: `Bilaga ${number}`,
      image: `${folder}${attachmentImages[number - 1] || defaultImage}`,
      ...itemContent(markdown, match[0].replace(/^##\s+/, "").trim())
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
export function parseArchiveMarkdown(markdown, { fileName, folder = "", id, attachmentImages = [] } = {}) {
  const type = DOCUMENT_FILES[path.basename(fileName || "").toLowerCase()];
  if (!type) throw new Error("Expected a file named letter.md or postcard.md");

  const date = metadataField(markdown, "Date", ["Datum"]);
  const age = metadataField(markdown, "Sender Age", ["Urbans ålder", "Avsändarens ålder"]);
  const sourceType = metadataField(markdown, "Type", ["Typ"]);
  return {
    id: id || date,
    date,
    from: metadataField(markdown, "From", ["Avsändare"]),
    to: metadataField(markdown, "To", ["Mottagare"]),
    senderAge: Number.parseInt(age, 10) || undefined,
    type: /vykort|postcard/i.test(sourceType) ? "postcard" : type,
    writingType: metadataField(markdown, "Writing Type", ["Skrivtyp"]) || undefined,
    folder,
    postmarked: lineField(markdown, ["Poststämplat"]) || undefined,
    fromPlace: lineField(markdown, ["Från"]) || undefined,
    toPlace: lineField(markdown, ["Till"]) || undefined,
    summary: section(markdown, "Summary", "#") || section(markdown, "Sammanfattning", "#"),
    sections: topLevelSections(markdown),
    items: type === "postcard" ? parsePostcard(markdown, folder) : parseLetter(markdown, folder, attachmentImages)
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { readFile, readdir } = await import("node:fs/promises");
  const sourcePath = process.argv[2];
  if (!sourcePath) throw new Error("Usage: node archive-markdown.mjs <letter.md|postcard.md>");
  const markdown = await readFile(sourcePath, "utf8");
  const folder = `${path.dirname(sourcePath).replaceAll("\\", "/")}/`;
  let attachmentImages = [];
  try {
    attachmentImages = (await readdir(path.join(path.dirname(sourcePath), "attachments")))
      .filter((name) => /^attachment-\d+/i.test(name))
      .sort()
      .map((name) => `attachments/${name}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  console.log(JSON.stringify(parseArchiveMarkdown(markdown, { fileName: sourcePath, folder, attachmentImages }), null, 2));
}
