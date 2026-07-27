const app = document.querySelector("#app");
const viewer = document.querySelector("#image-viewer");
const viewerContent = viewer.querySelector(".viewer-content");
const viewerClose = viewer.querySelector(".viewer-close");

const typeLabels = {
  handwritten: "Handskrivet",
  typewritten: "Maskinskrivet",
  mixed: "Blandat"
};

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
  return swedishDate.format(new Date(`${date}T12:00:00Z`));
}

function letterPageCount(letter) {
  return letter.images.filter((image) => image.kind === "page").length;
}

function imagePath(letter, image) {
  return `${letter.folder}${image.file}`;
}

function createPlaceholder(image, compact = false) {
  const placeholder = document.createElement("div");
  placeholder.className = `image-placeholder${compact ? " image-placeholder--compact" : ""}`;
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", `${image.label}. Bilden saknas.`);
  placeholder.innerHTML = `
    <span class="placeholder-mark" aria-hidden="true">✦</span>
    <strong>${image.label}</strong>
    <span>${image.file}</span>
    <small>Originalbild kommer senare</small>
  `;
  return placeholder;
}

function createArchiveImage(letter) {
  const envelope =
    letter.images.find((image) => image.file === "envelope-front.jpg") ||
    letter.images.find((image) => image.kind === "envelope") ||
    letter.images[0];
  const frame = document.createElement("div");
  frame.className = "card-image";

  if (!envelope) {
    frame.append(createPlaceholder({ label: "Kuvert", file: "Bild saknas" }, true));
    return frame;
  }

  const image = new Image();
  image.src = imagePath(letter, envelope);
  image.alt = envelope.label;
  image.loading = "lazy";
  image.addEventListener("error", () => image.replaceWith(createPlaceholder(envelope, true)));
  frame.append(image);
  return frame;
}

function renderArchive() {
  activeLetter = null;
  document.title = "LetterArchive – Breven till Ulf";
  const section = document.createElement("section");
  section.className = "archive";
  section.setAttribute("aria-labelledby", "archive-heading");
  section.innerHTML = `
    <div class="section-heading">
      <p class="eyebrow">Samlingen</p>
      <h1 id="archive-heading">Brevarkivet</h1>
      <p>${letters.length} ${letters.length === 1 ? "brev" : "brev"} bevarade i arkivet</p>
    </div>
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
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([year, yearLetters]) => {
      const yearSection = document.createElement("section");
      yearSection.className = "year-group";
      yearSection.innerHTML = `<h2><span>${year}</span></h2>`;
      const grid = document.createElement("div");
      grid.className = "letter-grid";

      yearLetters
        .sort((a, b) => b.date.localeCompare(a.date))
        .forEach((letter) => {
          const article = document.createElement("article");
          article.className = "letter-card";
          article.append(createArchiveImage(letter));

          const details = document.createElement("div");
          details.className = "card-details";
          details.innerHTML = `
            <time datetime="${letter.date}">${formatDate(letter.date)}</time>
            <ul>
              <li>${letter.from}, ${letter.senderAge} år</li>
              <li>${letterPageCount(letter)} sidor</li>
              <li>${typeLabels[letter.type] || letter.type}</li>
            </ul>
            <a class="open-letter" href="#brev/${encodeURIComponent(letter.id)}">
              Öppna brevet <span aria-hidden="true">→</span>
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

function createOriginalImage(letter, image) {
  const frame = document.createElement("button");
  frame.className = "original-frame";
  frame.type = "button";
  frame.setAttribute("aria-label", `Förstora ${image.label.toLowerCase()}`);

  const img = new Image();
  img.src = imagePath(letter, image);
  img.alt = image.label;
  img.addEventListener("error", () => {
    frame.disabled = true;
    frame.removeAttribute("aria-label");
    img.replaceWith(createPlaceholder(image));
  });
  frame.append(img);
  frame.addEventListener("click", () => openViewer(letter, image));
  return frame;
}

function imagePositionLabel(letter, index) {
  const image = letter.images[index];
  if (image.kind === "envelope") {
    const envelopeImages = letter.images.filter((item) => item.kind === "envelope");
    const position = envelopeImages.indexOf(image) + 1;
    return `Kuvert ${position} av ${envelopeImages.length}`;
  }
  return `Sida ${image.page} av ${letterPageCount(letter)}`;
}

function updateOriginal() {
  const image = activeLetter.images[activeImageIndex];
  const stage = app.querySelector(".original-stage");
  stage.replaceChildren(createOriginalImage(activeLetter, image));
  app.querySelector(".image-position").textContent = imagePositionLabel(
    activeLetter,
    activeImageIndex
  );
  app.querySelector(".previous-image").disabled = activeImageIndex === 0;
  app.querySelector(".next-image").disabled =
    activeImageIndex === activeLetter.images.length - 1;
}

function moveImage(direction) {
  if (!activeLetter || !app.querySelector(".original-panel:not([hidden])")) return;
  const nextIndex = activeImageIndex + direction;
  if (nextIndex < 0 || nextIndex >= activeLetter.images.length) return;
  activeImageIndex = nextIndex;
  updateOriginal();
}

function createTranscription(letter) {
  const panel = document.createElement("section");
  panel.className = "transcription-panel";
  panel.hidden = true;

  if (letter.transcription.note) {
    panel.innerHTML = `<p class="transcription-note">${letter.transcription.note}</p>`;
  }

  const pages = letter.images.filter((image) => image.kind === "page");
  pages.forEach((image) => {
    const transcription = letter.transcription.pages.find(
      (page) => page.page === image.page
    );
    const article = document.createElement("article");
    article.className = "transcription-page";
    article.innerHTML = `
      <h2>Sida ${image.page}</h2>
      ${
        transcription
          ? `<p>${transcription.text.replaceAll("\n", "<br>")}</p>`
          : '<p class="missing-transcription">Ingen transkription tillagd ännu.</p>'
      }
    `;
    panel.append(article);
  });
  return panel;
}

function renderLetter(letter) {
  activeLetter = letter;
  activeImageIndex = 0;
  document.title = `${formatDate(letter.date)} – LetterArchive`;

  const view = document.createElement("article");
  view.className = "letter-view";
  view.innerHTML = `
    <a class="back-link" href="#"><span aria-hidden="true">←</span> Tillbaka till arkivet</a>
    <header class="letter-heading">
      <p class="eyebrow">${typeLabels[letter.type] || letter.type} · ${letterPageCount(letter)} sidor</p>
      <h1><time datetime="${letter.date}">${formatDate(letter.date)}</time></h1>
      <p>${letter.from}, ${letter.senderAge} år <span aria-hidden="true">→</span> ${letter.to}</p>
    </header>
    <div class="mode-tabs" role="tablist" aria-label="Välj visningsläge">
      <button id="original-tab" class="mode-tab is-active" role="tab" aria-selected="true" aria-controls="original-panel" type="button">Original</button>
      <button id="transcription-tab" class="mode-tab" role="tab" aria-selected="false" aria-controls="transcription-panel" type="button">Transkription</button>
    </div>
    <section id="original-panel" class="original-panel" role="tabpanel" aria-labelledby="original-tab">
      <div class="original-stage"></div>
      <nav class="image-navigation" aria-label="Bläddra bland originalbilder">
        <button class="previous-image" type="button"><span aria-hidden="true">←</span> Föregående</button>
        <p class="image-position" aria-live="polite"></p>
        <button class="next-image" type="button">Nästa <span aria-hidden="true">→</span></button>
      </nav>
      <p class="image-hint">Tryck på bilden för att se den i större format.</p>
    </section>
  `;

  const transcription = createTranscription(letter);
  transcription.id = "transcription-panel";
  transcription.setAttribute("role", "tabpanel");
  transcription.setAttribute("aria-labelledby", "transcription-tab");
  view.append(transcription);
  app.replaceChildren(view);

  view.querySelector(".previous-image").addEventListener("click", () => moveImage(-1));
  view.querySelector(".next-image").addEventListener("click", () => moveImage(1));
  view.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.id === "original-tab"));
  });
  updateOriginal();
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

function openViewer(letter, image) {
  lastFocusedElement = document.activeElement;
  const fullImage = new Image();
  fullImage.src = imagePath(letter, image);
  fullImage.alt = image.label;
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
        <h1>Brevet kunde inte hittas</h1>
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
    letters = data.letters;
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
