const app = document.querySelector("#app");
const viewer = document.querySelector("#image-viewer");
const viewerContent = viewer.querySelector(".viewer-content");
const viewerClose = viewer.querySelector(".viewer-close");

const writingTypeLabels = {
  handwritten: "Handskrivet",
  typewritten: "Maskinskrivet",
  mixed: "Blandat"
};

const documentTypes = {
  letter: {
    label: "Brev",
    badge: "Letter",
    icon: "📄",
    openLabel: "Öppna brevet",
    previewItemTypes: ["envelope-front", "envelope-back", "page"]
  },
  postcard: {
    label: "Vykort",
    badge: "Postcard",
    icon: "🖼️",
    openLabel: "Öppna vykortet",
    previewItemTypes: ["front", "back"]
  }
};

const primarySectionTitles = new Set([
  "letter",
  "brev",
  "vykort",
  "front",
  "framsida",
  "vykortets framsida",
  "back",
  "baksida",
  "vykortets baksida",
  "kuvert",
  "bilagor",
  "transcription",
  "transkribering",
  "transkription",
  "summary",
  "sammanfattning"
]);

// Only source material and document structure remain open by default. Every
// other top-level Markdown section is treated as editorial and collapsible, so
// future analytical headings require no rendering changes.
const openStructuralSectionTitles = new Set([
  "metadata",
  "grunduppgifter",
  "fakta",
  "datum",
  "date",
  "postmarked",
  "location",
  "envelope",
  "envelope front",
  "envelope back",
  "attachments",
  "bild",
  "bilder",
  "beskrivning",
  "description"
]);

let letters = [];
let activeLetter = null;
let activeImageIndex = 0;
let touchStartX = 0;
let lastFocusedElement = null;

const swedishDate = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});

function formatDate(date) {
  const unknownDate = date.match(/^(\d{4})-unknown(?:-\d+)?$/);
  if (unknownDate) return `Troligen ${unknownDate[1]}`;
  return swedishDate.format(new Date(`${date}T12:00:00Z`));
}

function dateTimeAttribute(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? ` datetime="${date}"` : "";
}

function senderLabel(letter) {
  return Number.isFinite(letter.senderAge)
    ? `${letter.from}, ${letter.senderAge} år`
    : letter.from;
}

function correspondenceDirection(letter) {
  const normalizeName = (name) => String(name || "")
    .trim()
    .toLocaleLowerCase("sv-SE");
  const from = normalizeName(letter.from);
  const to = normalizeName(letter.to);
  const isUrban = (name) => name === "urban" || name === "urban sandlund";
  const isUlf = (name) => name === "ulf" || name === "ulf sandlund";

  if (isUrban(from) && isUlf(to)) return "urban-to-ulf";
  if (isUlf(from) && isUrban(to)) return "ulf-to-urban";
  return "";
}

function letterPageCount(letter) {
  return letter.items.filter((item) => item.type === "page").length;
}

function attachmentCount(letter) {
  return letter.items.filter((item) => item.type === "attachment").length;
}

function documentType(document) {
  return documentTypes[document.type] || documentTypes.letter;
}

function imagePath(item) {
  return item.image;
}

function imageFileName(item) {
  return item.image.split("/").pop();
}

function createPlaceholder(item, compact = false) {
  const placeholder = document.createElement("div");
  placeholder.className = `image-placeholder${compact ? " image-placeholder--compact" : ""}`;
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", `${item.label}. Bilden saknas.`);
  placeholder.innerHTML = `
    <span class="placeholder-mark" aria-hidden="true">✦</span>
    <strong>${item.label}</strong>
    <span>${imageFileName(item)}</span>
    <small>Originalbild kommer senare</small>
  `;
  return placeholder;
}

function createArchiveImage(letter) {
  const preferredTypes = documentType(letter).previewItemTypes;
  const envelope =
    preferredTypes.map((type) => letter.items.find((item) => item.type === type)).find(Boolean) ||
    letter.items.find((item) => item.type.startsWith("envelope")) ||
    letter.items[0];
  const frame = document.createElement("div");
  frame.className = "card-image";

  if (!envelope) {
    frame.append(
      createPlaceholder({ label: "Kuvert", image: "Bild saknas" }, true)
    );
    return frame;
  }

  const image = new Image();
  image.src = imagePath(envelope);
  image.alt = envelope.label;
  image.loading = "lazy";
  image.addEventListener("error", () => image.replaceWith(createPlaceholder(envelope, true)));
  frame.append(image);
  return frame;
}

function renderArchive() {
  activeLetter = null;
  document.title = "LetterArchive – Arkiv";
  const years = letters.map((letter) => letter.date.slice(0, 4));
  const yearRange = years.length
    ? `${Math.min(...years)}${Math.min(...years) === Math.max(...years) ? "" : `–${Math.max(...years)}`}`
    : "Inga årtal";
  const section = document.createElement("section");
  section.className = "archive";
  section.setAttribute("aria-labelledby", "archive-heading");
  section.innerHTML = `
    <header class="archive-introduction">
      <h1 id="archive-heading">Arkiv</h1>
      <p>En samling försändelser från Urban till kusinen Ulf.<br>Original, bilagor och transkriberad text.</p>
      <p class="archive-statistics">${letters.length} objekt <span aria-hidden="true">•</span> ${yearRange}</p>
    </header>
  `;

  const byYear = Map.groupBy
    ? Map.groupBy(letters, (letter) => letter.date.slice(0, 4))
    : letters.reduce((groups, letter) => {
        const year = letter.date.slice(0, 4);
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(letter);
        return groups;
      }, new Map());

  [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([year, yearLetters]) => {
      const yearSection = document.createElement("section");
      yearSection.className = "year-group";
      yearSection.innerHTML = `<h2><span>${year}</span></h2>`;
      const grid = document.createElement("div");
      grid.className = "letter-grid";

      yearLetters
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((letter) => {
          const attachments = attachmentCount(letter);
          const kind = documentType(letter);
          const article = document.createElement("article");
          article.className = `letter-card ${correspondenceDirection(letter)}`.trim();
          article.append(createArchiveImage(letter));

          const details = document.createElement("div");
          details.className = "card-details";
          details.innerHTML = `
            <p class="document-type"><span aria-hidden="true">${kind.icon}</span> ${kind.badge}</p>
            <time${dateTimeAttribute(letter.date)}>${formatDate(letter.date)}</time>
            <ul>
              <li>${senderLabel(letter)}</li>
              ${letter.type === "letter" ? `<li>${letterPageCount(letter)} sidor</li>` : ""}
              ${attachments ? `<li>${attachments} ${attachments === 1 ? "bilaga" : "bilagor"}</li>` : ""}
              ${letter.writingType ? `<li>${writingTypeLabels[letter.writingType] || letter.writingType}</li>` : ""}
            </ul>
            <a class="open-letter" href="#brev/${encodeURIComponent(letter.id)}">
              ${kind.openLabel} <span aria-hidden="true">→</span>
            </a>
          `;
          article.append(details);
          grid.append(article);
        });

      yearSection.append(grid);
      section.append(yearSection);
    });

  app.replaceChildren(section);
  app.focus({ preventScroll: true });
}

function createOriginalImage(item) {
  const frame = document.createElement("button");
  frame.className = "original-frame";
  frame.type = "button";
  frame.setAttribute("aria-label", `Förstora ${item.label.toLowerCase()}`);

  const img = new Image();
  img.src = imagePath(item);
  img.alt = item.label;
  img.addEventListener("error", () => {
    frame.disabled = true;
    frame.removeAttribute("aria-label");
    img.replaceWith(createPlaceholder(item));
  });
  frame.append(img);
  frame.addEventListener("click", () => openViewer(item));
  return frame;
}

function imagePositionLabel(letter, index) {
  const item = letter.items[index];
  return `${item.label} · ${index + 1} av ${letter.items.length}`;
}

function updateItem() {
  const item = activeLetter.items[activeImageIndex];
  const stage = app.querySelector(".original-stage");
  stage.replaceChildren();
  if (item.type === "attachment") {
    stage.append(createItemHeading(item));
  }
  stage.append(createOriginalImage(item));
  updateTranscription(item);
  app.querySelector(".image-position").textContent =
    imagePositionLabel(activeLetter, activeImageIndex);
  app.querySelector(".previous-image").disabled = activeImageIndex === 0;
  app.querySelector(".next-image").disabled =
    activeImageIndex === activeLetter.items.length - 1;
}

function createItemHeading(item) {
  const heading = document.createElement("header");
  heading.className = "item-heading";

  const label = document.createElement("h2");
  label.textContent = item.label;
  heading.append(label);

  if (item.title) {
    const title = document.createElement("p");
    title.textContent = item.title;
    heading.append(title);
  }

  return heading;
}

function moveImage(direction) {
  if (!activeLetter) return;
  const nextIndex = activeImageIndex + direction;
  if (nextIndex < 0 || nextIndex >= activeLetter.items.length) return;
  activeImageIndex = nextIndex;
  updateItem();
}

function createTranscription() {
  const panel = document.createElement("section");
  panel.className = "transcription-panel";
  panel.hidden = true;
  panel.innerHTML = '<article class="transcription-page"></article>';
  return panel;
}

function updateTranscription(item) {
  const article = app.querySelector(".transcription-page");
  article.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = item.label;
  article.append(heading);

  if (item.title) {
    const title = document.createElement("p");
    title.className = "item-title";
    title.textContent = item.title;
    article.append(title);
  }

  if (item.transcriptionNote) {
    const note = document.createElement("p");
    note.className = "transcription-note";
    note.textContent = item.transcriptionNote;
    article.append(note);
  }

  if (item.transcription) {
    const transcriptionSection = document.createElement("section");
    transcriptionSection.className = "item-transcription";
    const transcriptionHeading = document.createElement("h3");
    transcriptionHeading.textContent = "Transkription";
    const transcription = document.createElement("p");
    transcription.className = "transcription-text";
    transcription.textContent = item.transcription;
    transcriptionSection.append(transcriptionHeading, transcription);
    article.append(transcriptionSection);
  }

  if (item.description) {
    const descriptionSection = document.createElement("section");
    descriptionSection.className = "item-description";
    const descriptionHeading = document.createElement("h3");
    descriptionHeading.textContent = "Beskrivning";
    const description = document.createElement("p");
    description.textContent = item.description;
    descriptionSection.append(descriptionHeading, description);
    article.append(descriptionSection);
  }

  if (!item.transcription && !item.description) {
    const missingText = document.createElement("p");
    missingText.className = "missing-transcription";
    missingText.textContent =
      "Ingen text eller beskrivning registrerad för detta objekt ännu.";
    article.append(missingText);
  }
}

function sectionPlainText(markdown) {
  return markdown
    .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, "")
    .replace(/^#{2,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/ {2}$/gm, "")
    .replace(/^---\s*$/gm, "")
    .trim();
}

function normalizedSectionTitle(title) {
  return title
    .trim()
    .toLocaleLowerCase("sv-SE")
    .replace(/[–—]/g, "-");
}

function isPrimarySectionTitle(title) {
  const normalized = normalizedSectionTitle(title);

  return (
    primarySectionTitles.has(normalized) ||
    /^(brev|letter|vykort|postcard)(?:\s+\d{4}-\d{2}-\d{2})?$/.test(normalized) ||
    /^(?:vykort|kuvert)(?:ets?)?\s*(?:-\s*)?(?:fram|bak)sida$/.test(normalized) ||
    /^(?:page|sida)\s+\d+$/.test(normalized)
  );
}

function isOpenStructuralSectionTitle(title) {
  const normalized = normalizedSectionTitle(title);
  return (
    openStructuralSectionTitles.has(normalized) ||
    /^\d{4}-\d{2}-\d{2}(?:\s+-\s+.*)?$/.test(normalized) ||
    /^(?:brev(?:et)?|letter)(?:\s+.*)?$/.test(normalized) ||
    /^(?:bilaga|attachment)\s+\d+(?:\s+-\s+.*)?$/.test(normalized) ||
    /^(?:page|sida|ark)\s+\d+(?:\s+-\s+.*)?$/.test(normalized)
  );
}

function createSectionContent(content, cleanMarkdown = true) {
  const paragraph = document.createElement("p");
  paragraph.textContent = cleanMarkdown ? sectionPlainText(content) : content;
  return paragraph;
}

function createCollapsibleSection(title, content, cleanMarkdown = true) {
  const details = document.createElement("details");
  details.className = "letter-summary letter-collapsible-section";

  const toggle = document.createElement("summary");
  toggle.className = "letter-collapsible-toggle";

  const chevron = document.createElement("span");
  chevron.className = "letter-collapsible-chevron";
  chevron.setAttribute("aria-hidden", "true");

  const heading = document.createElement("span");
  heading.className = "letter-collapsible-heading";
  heading.textContent = title;

  const body = document.createElement("div");
  body.className = "letter-collapsible-content";
  body.append(createSectionContent(content, cleanMarkdown));

  toggle.append(chevron, heading);
  details.append(toggle, body);
  return details;
}

function createOpenAdditionalSection(title, content, index) {
  const section = document.createElement("section");
  section.className = "letter-summary letter-additional-section";
  const heading = document.createElement("h2");
  heading.id = `letter-additional-section-${index + 1}`;
  heading.textContent = title;
  section.setAttribute("aria-labelledby", heading.id);
  section.append(heading, createSectionContent(content));
  return section;
}

function appendAdditionalSections(view, letter) {
  const sections = (letter.sections || []).filter(
    (section) =>
      section?.title &&
      section?.content &&
      !isPrimarySectionTitle(section.title)
  );

  sections.forEach((archiveSection, index) => {
    view.append(
      isOpenStructuralSectionTitle(archiveSection.title)
        ? createOpenAdditionalSection(archiveSection.title, archiveSection.content, index)
        : createCollapsibleSection(archiveSection.title, archiveSection.content)
    );
  });
}

function renderLetter(letter) {
  activeLetter = letter;
  activeImageIndex = 0;
  document.title = `${formatDate(letter.date)} – LetterArchive`;

  const kind = documentType(letter);
  const detailMeta = letter.type === "letter"
    ? `${letter.writingType ? `${writingTypeLabels[letter.writingType] || letter.writingType} · ` : ""}${letterPageCount(letter)} sidor`
    : kind.label;
  const view = document.createElement("article");
  view.className = `letter-view ${correspondenceDirection(letter)}`.trim();
  view.innerHTML = `
    <a class="back-link" href="#"><span aria-hidden="true">←</span> Tillbaka till arkivet</a>
    <header class="letter-heading">
      <p class="eyebrow">${detailMeta}</p>
      <h1><time${dateTimeAttribute(letter.date)}>${formatDate(letter.date)}</time></h1>
      <p>${senderLabel(letter)} <span aria-hidden="true">→</span> ${letter.to}</p>
    </header>
    <div class="mode-tabs" role="tablist" aria-label="Välj visningsläge">
      <button id="original-tab" class="mode-tab is-active" role="tab" aria-selected="true" aria-controls="original-panel" type="button">Original</button>
      <button id="transcription-tab" class="mode-tab" role="tab" aria-selected="false" aria-controls="transcription-panel" type="button">Text</button>
    </div>
    <section id="original-panel" class="original-panel" role="tabpanel" aria-labelledby="original-tab">
      <div class="original-stage"></div>
      <p class="image-hint">Tryck på bilden för att se den i större format.</p>
    </section>
  `;

  const transcription = createTranscription();
  transcription.id = "transcription-panel";
  transcription.setAttribute("role", "tabpanel");
  transcription.setAttribute("aria-labelledby", "transcription-tab");
  view.append(transcription);

  const navigation = document.createElement("nav");
  navigation.className = "image-navigation";
  navigation.setAttribute("aria-label", `Bläddra bland ${kind.label.toLowerCase()}ets delar`);
  navigation.innerHTML = `
    <button class="previous-image" type="button"><span aria-hidden="true">←</span> Föregående</button>
    <p class="image-position" aria-live="polite"></p>
    <button class="next-image" type="button">Nästa <span aria-hidden="true">→</span></button>
  `;
  view.append(navigation);

  if (letter.summary) {
    view.append(createCollapsibleSection("Sammanfattning", letter.summary, false));
  }

  appendAdditionalSections(view, letter);

  app.replaceChildren(view);

  view.querySelector(".previous-image").addEventListener("click", () => moveImage(-1));
  view.querySelector(".next-image").addEventListener("click", () => moveImage(1));
  view.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.id === "original-tab"));
  });
  updateItem();
  app.focus({ preventScroll: true });
}

function setMode(showOriginal) {
  const originalTab = app.querySelector("#original-tab");
  const transcriptionTab = app.querySelector("#transcription-tab");
  const originalPanel = app.querySelector("#original-panel");
  const transcriptionPanel = app.querySelector("#transcription-panel");

  originalTab.classList.toggle("is-active", showOriginal);
  transcriptionTab.classList.toggle("is-active", !showOriginal);
  originalTab.setAttribute("aria-selected", String(showOriginal));
  transcriptionTab.setAttribute("aria-selected", String(!showOriginal));
  originalPanel.hidden = !showOriginal;
  transcriptionPanel.hidden = showOriginal;
}

function openViewer(item) {
  lastFocusedElement = document.activeElement;
  const fullImage = new Image();
  fullImage.src = imagePath(item);
  fullImage.alt = item.label;
  viewerContent.replaceChildren(fullImage);
  viewer.hidden = false;
  document.body.classList.add("viewer-open");
  viewerClose.focus();
}

function closeViewer() {
  viewer.hidden = true;
  viewerContent.replaceChildren();
  document.body.classList.remove("viewer-open");
  lastFocusedElement?.focus();
}

function handleRoute() {
  const match = location.hash.match(/^#brev\/(.+)$/);
  if (!match) {
    renderArchive();
    return;
  }
  const letter = letters.find((item) => item.id === decodeURIComponent(match[1]));
  if (letter) renderLetter(letter);
  else {
    app.innerHTML = `
      <section class="error-message">
        <h1>Objektet kunde inte hittas</h1>
        <p><a href="#">Tillbaka till arkivet</a></p>
      </section>
    `;
  }
}

async function loadArchive() {
  try {
    const response = await fetch("letters.json");
    if (!response.ok) throw new Error("Kunde inte läsa letters.json");
    const data = await response.json();
    letters = data.letters.map(normalizeLetter);
    handleRoute();
  } catch (error) {
    app.innerHTML = `
      <section class="error-message" role="alert">
        <h1>Arkivet kunde inte öppnas</h1>
        <p>Kontrollera att webbplatsen körs via en webbserver och att <code>letters.json</code> finns.</p>
      </section>
    `;
    console.error(error);
  }
}

function normalizeLetter(letter) {
  // `type` historically described the writing style. Only registered document
  // types are interpreted as document types; all legacy records remain letters.
  const isDocumentType = Object.hasOwn(documentTypes, letter.type);
  const normalized = {
    ...letter,
    type: isDocumentType ? letter.type : "letter",
    writingType: letter.writingType || (isDocumentType ? undefined : letter.type)
  };

  if (normalized.items || normalized.type === "postcard") return normalizeDocumentItems(normalized);

  const legacyPages = letter.transcription?.pages || [];
  return {
    ...normalized,
    items: (letter.images || []).map((image) => {
      const legacyTranscription = legacyPages.find(
        (page) => image.kind === "page" && page.page === image.page
      );
      return {
        type:
          image.kind === "page"
            ? "page"
            : image.file === "envelope-front.jpg"
              ? "envelope-front"
              : "envelope-back",
        page: image.page,
        label: image.label,
        image: `${letter.folder || ""}${image.file}`,
        transcription: legacyTranscription?.text || "",
        transcriptionStatus: legacyTranscription
          ? letter.transcription?.status
          : undefined,
        transcriptionNote: legacyTranscription
          ? letter.transcription?.note
          : undefined,
        description: ""
      };
    })
  };
}

function normalizeDocumentItems(document) {
  if (document.type !== "postcard") return document;

  const folder = document.folder || "";
  const suppliedItems = document.items || [];
  const items = suppliedItems.length
    ? suppliedItems
    : [
        { type: "front", label: "Front", image: `${folder}postcard-front.jpg` },
        { type: "back", label: "Back", image: `${folder}postcard-back.jpg` }
      ];

  return {
    ...document,
    items: items.map((item) => ({
      transcription: "",
      description: "",
      ...item,
      label: item.label || (item.type === "front" ? "Front" : item.type === "back" ? "Back" : item.type)
    }))
  };
}

window.addEventListener("hashchange", handleRoute);
document.addEventListener("keydown", (event) => {
  if (!viewer.hidden) {
    if (event.key === "Escape") closeViewer();
    return;
  }
  if (event.key === "ArrowLeft") moveImage(-1);
  if (event.key === "ArrowRight") moveImage(1);
});

viewerClose.addEventListener("click", closeViewer);
viewer.addEventListener("click", (event) => {
  if (event.target === viewer) closeViewer();
});

app.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
  },
  { passive: true }
);
app.addEventListener(
  "touchend",
  (event) => {
    const distance = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(distance) > 55) moveImage(distance > 0 ? -1 : 1);
  },
  { passive: true }
);

loadArchive();
