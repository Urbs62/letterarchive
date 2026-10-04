# Continuous Reader Audit

Date: 2026-10-04

Purpose:
Document the archive-wide analysis performed before generalizing the
continuous-reading interface. This report should remain as a reference when
reviewing REVIEW and SPECIAL letters and when implementing the reader
archive-wide.

## Prototype status

The continuous reader has so far been prototyped on:

- 1975-08-27
- 1974-09-17

The contextual-photo placement experiment in 1974-09-17 is still being evaluated and should not be treated as a finalized design decision. Contextual-photo placement was excluded from this audit.

## Audit scope and totals

**Audited all 38 letter entries and their 162 registered letter-page images**, comparing the `letter.md` transcriptions with their representation in `letters.json` and the current renderer. The archive’s other 22 entries are postcards or artifacts, outside this letter audit.

| Classification | Count |
|---|---:|
| SAFE | **3** |
| REVIEW | **25** |
| SPECIAL | **10** |
| **Total** | **38** |

These are conservative classifications for **automatic prose reflow**, not judgments about whether a letter can use continuous reading. Most REVIEW and SPECIAL letters can still have continuous scrolling, with their exceptional passages preserved separately.

No files were modified during the audit. No rebuild, import, tests, commit or push was performed.

## SAFE entries

1971-01-31, 1976-12-27 and 1977-05-09 contain ordinary prose without formatting that appears to require special treatment.

## REVIEW entries

Each date below identifies its folder: `letters/YYYY/date/`. Page references follow the existing registered numbering.

| Date/folder | Relevant pages | Reason and extent |
|---|---|---|
| 1972-12-10 | 1 | Source transcription uses a fenced text block and positioned heading/signature. JSON has already simplified this. Check those local elements; body is prose. |
| 1974-03-05 | 1–2 | Drawing labels, a “Historia” heading and numbered replies. Preserve the local list structure. |
| 1974-08-23 | 1–3, especially 3 | Wordplay entries and deliberately broken farewell lines. Three attachments remain separate. |
| 1974-09-17 | 2 | Room-dimension list and an indented calculation. Page 1 is ordinary prose. |
| 1975-05-29 | 1–3 | Questions, repeated song lines and dialogue use meaningful line divisions. |
| 1975-07-22 | 2 | Numbered illustration key, including nested 7a/7b entries. Other prose can reflow. |
| 1975-08-27 | 2 and 4 | Text winding around Frasse is already represented as linear text plus explanatory notes; page 4 contains verse/wordplay. Successful prototype use does not establish that every original line break is dispensable. |
| 1976-08-07 | 1–4 | Drawing descriptions, labels and quoted/editorial material mixed with prose. Geometry is described rather than spatially transcribed. |
| 1976-09-xx | 1–2, 4–10, 12 | Long inventory, wordplay lists and dialogue/speaker divisions. Review those blocks rather than preserving every prose line. |
| 1976-11-14 | 2 and 4 | Writing-session markers, an anchored clock image, and a heart rebus already expanded into readable words plus a description. Preserve these local distinctions. |
| 1976-12-30 | Entire entry’s organization | **26 loose slips are transcribed under `Småarken`; the six page items are documentation photographs with empty transcription fields.** The existing prototype would not put the main text into its continuous page flow. |
| 1977-01-18 | 3–4 | Verse, author attributions and dialogue. Preserve verse lines and speaker divisions. |
| 1977-03-02 | 1, 5; attachments | Map labels and typing exercises; attachments contain questions, a table and graph explanation. Body and attachments need distinct treatment. |
| 1977-03-03 | 1–2; attachments | Writing-session divisions and typing experiments; separate map, question sheets and newspaper clippings. Mostly ordinary body prose. |
| 1977-04-04 | 4, 6, 11, 14–15 | Drawing-heavy pages, a grade list, a typewriter figure already represented descriptively, and a map continuing across two images. Source also repeats the “Sida 8” heading; JSON has unique page numbers. |
| 1977-06-10 | 1 | Quiz/result material and accompanying notes. Local list treatment needs checking. |
| 1977-09-07 | 1; inner-envelope attachments | Almost blank folded sheet with a positioned question mark. Its emptiness is meaningful; this is not a conventional prose letter. |
| 1977-11-03 | 1, 5–8; attachments | Missing opening sheet, dialogue indentation, drawing labels, typing experiments and an incomplete ending. Separate IQ/model material must remain separate. |
| 1978-01-09 | 1 | Typed and handwritten continuations with separate dates share one photographed page. Check transitions and attribution. |
| 1978-06-12 | 1 | Elephant jokes with parenthetical comments and guest contributions. Local divisions matter. |
| 1978-08-24 | 1–2, 4–5; attachments | Numbered photo comments and gearing calculations across a page boundary. Labyrinth and viewing mask are separate interactive material, with part of the game on the envelope. |
| 1978-09-25 | 4–5 | Numbered stages and a separate short note/slip with deliberate uppercase line breaks. Page 5 should remain identifiable as a note. |
| 1980-01-22 | 2–3; attachment | Quoted lyrics need preserved verse lines. Biorythm graph remains a separate attachment. |
| 1980-03-11 | 1–2 | Computer output, quoted lyrics, typed/handwritten transitions and a standalone mathematical expression. |
| 1980-12-29 | 1–4 | Marginal formula descriptions, drawing labels, an indented anecdote and handwritten additions. Ordinary prose elsewhere can reflow. |

## SPECIAL entries

The classification flags the entry for exceptional handling; **only the portions identified below require that handling**.

| Date/folder | Exceptional portion | Why ordinary reflow is unsafe there |
|---|---|---|
| 1974-02-12 | Page 1 rebuses/riddle; page 2 vertical word arrangement and spiral story | Position and reading direction contribute to meaning. Spiral geometry is only approximately represented in text. Answer flaps add physical context. |
| 1974-02-19 | Page 1 recipe block | Ingredients are arranged in two columns. Collapsing whitespace destroys their grouping. Page 2 can mostly reflow. |
| 1975-08-13 | Page 3 typewriter outburst/fragmented arrangement | Indentation, spacing and repeated characters form part of the performance. Lists elsewhere require review, not blanket fixed formatting. |
| 1976-04-20 | Page 1 score matrix; loose-slip/flap portions on pages 3–4 | Column alignment matters. Photographs also document closed/open states rather than simply successive prose pages. |
| 1976-05-05 | Page 2 grade table | Side-by-side subjects and actual/predicted values depend on alignment. Surrounding prose can reflow. |
| 1976-05-xx | Page 1 character/treasure diagram | Positioned labels and symbols carry meaning. Twelve slips are grouped into two photographs rather than a simple chronological letter sequence. |
| 1976-08-27 | Page 1 “UU” figure; page 2 positioned fragments; pages 3–4 and 7 typing/figure experiments | Spacing, characters and line placement are intentional. Other passages remain ordinary prose. |
| 1976-10-29 | Page 3 X-character drawing; related graphical material on page 4 | Characters function as a picture. Lists and prose elsewhere can use separate treatment. |
| 1978-04-17 | Page 1 margin-justification joke and closing typing experiment | The writer explicitly discusses arranging sentences to achieve the margin. Reflow conceals the joke’s presentation. |
| 1979-04-30 | Page 1 stacked fraction; page 14 graphic rebus; page 17 upside-down note; flipbook-related portions from page 10 onward | These require preserved arrangement or reference to the scan. Most of the 18-page notepad is ordinary prose. |

Illustrations or rebuses **already translated into a linear description** were classified REVIEW rather than SPECIAL solely because their originals are spatial. This explains the distinction for 1975-08-27, 1976-11-14 and 1977-04-04.

## Can ordinary prose and exceptional formatting coexist with the current format?

**Yes, through rendering changes; no source-format change is required. But automatic detection is not sufficiently reliable.**

The current page objects already preserve page identity, order, transcription strings, descriptions and image references. Some exceptional blocks retain useful newlines and spaces. Those can remain in locally preserved blocks while ordinary paragraphs around them reflow.

However, the current prototype collapses single line breaks and whitespace in every transcription paragraph. That would flatten several lists, verses, tables and diagrams identified above. The stored strings have no consistent indication distinguishing a physical prose line ending from an intentional layout break.

Existing Markdown supplies clues—fences, headings, lists, quotations and tables—but those clues are not consistently retained in JSON or interpreted by the renderer. Geometry already reduced to explanatory text cannot be reconstructed from the transcription; the scan remains necessary.

Three structural findings particularly affect rollout:

- **1976-12-30:** main transcription lives in `sections.content`, not page transcriptions. No explicit slip-to-photograph mapping is provided.
- **1978-04-17:** JSON contains the page transcription, but its `letter.md` does not contain the corresponding body transcription.
- **1979-04-30:** the `Anteckningsblock` additional section also contains extensive page material alongside the individual page transcriptions. It needs checking for repeated content and reader placement.

The duplicate source heading in 1977-04-04 and differing Markdown conventions are further reasons to use the currently registered data rather than regenerate it during this UI rollout.

## Can original images be stacked independently?

**Yes, with qualifications.** All 162 registered letter-page image references resolve, and each letter’s registered page numbering is consecutive and ordered. Transcription classification does not prevent displaying those images vertically.

Use registered `page` items in their existing order, preserving their labels. Do not gather files by filename: some folders contain obsolete image files.

These entries need particular attention:

| Entries | Original-image consideration |
|---|---|
| 1974-02-12 | Glued answer flaps are physical features, not independently represented interactive states. |
| 1976-04-20, 1976-05-xx, 1976-12-30 | Photographs document groups of slips or alternate flap states. Preserve documentation labels; do not imply each photograph is one physical letter page. |
| 1976-10-29, 1977-09-07 | Unusual postcard/envelope construction or inner envelopes must stay in their existing separate material groups. |
| 1977-04-04 | Map continues across pages 14–15; stacking helps, but does not join the physical images. |
| 1977-11-03 | Missing opening material and incomplete ending remain limitations of the surviving letter. |
| 1978-08-24 | Labyrinth spans envelope/attachment material; stacking letter pages alone does not reproduce the game. |
| 1978-09-25 | Final page is a separate note; retain its identity. |
| 1979-04-30 | Notepad covers remain separate. Vertical scrolling does not reproduce its flipbook behavior. |

Other attachments—clippings, question sheets, wrappers, matchbox sheets and the biorythm graph—should keep their existing grouping.

Image loading also needs attention before global rollout: photographs are generally several megabytes each. The 1979-04-30 entry’s registered images total approximately **81 MB**. Reserve image dimensions before loading to prevent layout movement, and check loading behavior on mobile. This is a rendering concern, not a data-format blocker.

## Recommended smallest, safest rollout

1. Generalize **stacked originals first**, preserving registered order, labels, lightbox behavior and separate envelope/attachment material.
2. Generalize **continuous transcription containers and page separators**, initially retaining existing line formatting for unreviewed letters.
3. Enable automatic prose reflow for the three SAFE entries; keep the two existing prototypes individually scoped.
4. Review the listed exceptional blocks and apply narrow renderer-side treatments for verse, lists, tables and spatial text. Leave surrounding prose reflowable.
5. Handle the `Småarken` and notepad-section cases explicitly before enabling continuous transcription archive-wide.

**The archive format can support archive-wide continuous reading. The unsafe step would be enabling the prototype’s blanket whitespace reflow for every transcription unchanged.**
