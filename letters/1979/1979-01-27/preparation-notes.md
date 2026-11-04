# Preparation notes

Original source location: `letters/1979/1979-03-15/letter.md` (duplicate folder removed during cleanup).
Verbatim original Markdown backup: `source-backups/1979-03-15-letter-original.md`.
Original image SHA-256 manifest: `source-backups/1979-03-15-image-sha256.json`; all 44 originals remain in `letters/1979/1979-01-27/`.
Source SHA-256: b31ac34a5c701413192dfbf5bec0f2d7512bb594706de8211b95568c7bda4a45

Archive identity uses written date 1979-01-27; postmark remains unknown.
All 41 page bodies retain their text, indentation, trailing spaces and internal line breaks; CRLF is normalized to LF for import. Blank lines separating Markdown sections are structural. Fenced blocks protect the transcription from Markdown parsing.

Sida 41 says “sidan 40”; no renumbering or correction was made.
Summary and observations only change the writing period to 1979-01-27 through 1979-03-15. People and places are unchanged.
Envelope addresses and handwritten text are separated from descriptions without deleting information. The Ga-Jol box is one physical attachment; references to a cassette in the source do not create additional attachments.

The duplicate source folder was removed after byte-for-byte Markdown backup verification and SHA-256 comparison of all 44 images. Only the prepared entry is registered in letters.json. The importer refuses an existing id.
`prepare-1979-01-27.mjs` now verifies the completed import read-only against the backup and image manifest; it does not recreate or overwrite the import.

Validation on 2026-11-03:
- 31 parser/import and letter-preservation tests passed; all existing archive entries compare unchanged.
- All 44 copied image files match their source SHA-256 hashes.
- Archive browser suite: 255 checks passed outside the sandbox.
- Focused browser test: all 41 displayed texts and image references in order, original image loading/lightbox, separate material, fixed-width listings and no viewport overflow passed at 1280, 390 and 320 pixels. Final rerun exited successfully.
- Sandboxed browser runs timed out in DevTools. One unsandboxed focused run passed assertions but failed browser cleanup (taskkill exit 128); a repeat passed including cleanup.
- The broad reader suite's expected registry was updated to include this new letter after its initial registry assertion failed.
- Final broad Continuous Reader regression run passed at all three widths and exited successfully, including cleanup.

Cleanup validation on 2026-11-04:
- Original Markdown copied with exclusive creation and verified byte-for-byte before deletion; source SHA-256 unchanged.
- All 44 image hashes matched before and after deletion; the manifest preserves these checks without duplicate images.
- 31 parser/import/preservation tests passed after deletion; read-only preparation verification passed.
- Archive browser suite passed all 255 checks. Focused letter browser and broad Continuous Reader suites passed at 1280, 390 and 320 pixels, including cleanup.
- Sandboxed browser attempts timed out in DevTools; all three suites passed when rerun outside the sandbox.
- Imported letter Markdown and letters.json remain unchanged; no commit or push performed.
