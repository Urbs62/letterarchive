import path from "node:path";

// Keep section bodies verbatim (apart from CRLF normalization and outer space).
function blocks(markdown, level) {
  const lines = markdown.split(/\r?\n/);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#+)\s+(.+?)\s*$/);
    if (!match || match[1].length !== level) continue;
    let end = i + 1;
    while (end < lines.length && !(lines[end].match(/^(#+)\s/)?.[1].length <= level)) end++;
    found.push({ title: match[2], content: lines.slice(i + 1, end).join("\n").trim() });
  }
  return found;
}

function naturalImages(images) {
  const key = (name) => name.replace(/(^|[-_.])(front|framsida)(?=[-_.]|$)/i, (_, separator) => `${separator}0`)
    .replace(/(^|[-_.])(back|baksida)(?=[-_.]|$)/i, (_, separator) => `${separator}1`);
  return [...images].filter(name => /\.(jpe?g|png|webp|gif)$/i.test(name))
    .sort((a, b) => key(a).localeCompare(key(b), "sv", { numeric: true, sensitivity: "base" }));
}

export function parseArtifact(markdown, { folder = "", id, documentImages = [] } = {}) {
  const sections = blocks(markdown, 1);
  const metadataText = markdown.split(/^#\s+/m)[0] + "\n" +
    (sections.find(s => /^metadata$/i.test(s.title))?.content || "");
  const metadata = [];
  for (const line of metadataText.split(/\r?\n/)) {
    const match = line.match(/^(?:-\s*)?([^:]+):\s*(.*?)\s*$/);
    if (match) metadata.push({ label: match[1].trim(), value: match[2] });
  }
  const field = (...names) => metadata.find(m => names.some(n => n.toLowerCase() === m.label.toLowerCase()))?.value || "";
  const date = field("Datum", "Date") || "Okänt";
  const dateAnchor = date.match(/\b(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?\b/);
  const summary = sections.find(s => /^(sammanfattning|summary)$/i.test(s.title));
  const contentSections = sections.filter(s => !/^(metadata|sammanfattning|summary|iakttagelser|personer|platser)$/i.test(s.title));
  const imageSections = contentSections.flatMap((s, index) => blocks(s.content, 2)
    .filter(part => index === 0 || /^!\[[^\]]*\]\([^)]+\)/m.test(part.content))
    .map(part => ({ ...part, parent: s.title })));
  const images = naturalImages(documentImages);
  const used = new Set();
  const items = [];
  for (const part of imageSections) {
    const reference = part.content.match(/^!\[[^\]]*\]\(([^)]+)\)\s*$/m);
    const explicit = reference?.[1].replace(/^\.\//, "");
    if (explicit && !images.includes(explicit)) throw new Error(`Artifact image not found: ${explicit}`);
    const image = explicit || images.find(name => !used.has(name));
    if (!image) throw new Error(`No image for artifact section: ${part.title}`);
    if (used.has(image)) throw new Error(`Duplicate artifact image: ${image}`);
    used.add(image);
    const body = part.content.replace(/^!\[[^\]]*\]\([^)]+\)\s*$/gm, "").trim();
    const labelled = blocks(body, 3);
    items.push({
      type: "image", label: part.title, image: `${folder}${image}`,
      transcription: labelled.find(s => /^(transkription|transcription)$/i.test(s.title))?.content ??
        (labelled.some(s => /^(beskrivning|description)$/i.test(s.title)) ? "" : body),
      description: labelled.find(s => /^(beskrivning|description)$/i.test(s.title))?.content || ""
    });
  }
  for (const image of images.filter(name => !used.has(name))) {
    items.push({ type: "image", label: `Bild ${items.length + 1}`, image: `${folder}${image}`, transcription: "", description: "" });
  }
  // Remove only subsections displayed with images, retaining other analysis.
  const additional = sections.filter(s => !/^metadata$/i.test(s.title)).map(s => {
    const consumed = new Set(imageSections.filter(part => part.parent === s.title).map(part => part.title));
    let skip = false;
    const content = s.content.split("\n").filter(line => {
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) skip = consumed.has(heading[1]);
      return !skip;
    }).join("\n").trim();
    return { ...s, content };
  }).filter(s => s.content);
  return {
    id: id || path.posix.basename(folder.replace(/\/$/, "")),
    type: "artifact", title: field("Titel", "Title") || contentSections[0]?.title || "Arkivfynd",
    date, dateLabel: date,
    sortDate: dateAnchor ? dateAnchor[0] : null,
    archiveYear: dateAnchor?.[1] || null,
    from: field("Avsändare", "From"), to: field("Mottagare", "To"),
    senderAge: Number.parseInt(field("Urbans ålder", "Avsändarens ålder", "Sender Age"), 10) || undefined,
    fromPlace: field("Från"), toPlace: field("Till"),
    folder, metadata, summary: summary?.content || "", sections: additional, items
  };
}
