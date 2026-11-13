# Selected Work ends at the corridor; the archive moves to its own page

Supersedes ADR 0012.

Built, the archive wall read as volume without value: 171 cells of type the reader scrolls past, after four cards that each say something. Kevin's ruling, 2026-10-18, over a grilling round: a few selected pieces carry more than a wall of all of them. The scene ends when card four settles (back to `550svh`, the pre-wall length) and act two is deleted, not parked. Under the scene, **More work** lists the five projects the corridor does not carry, in `highlightOrder`, as open `WorkRow` rows, closed by one sentence claiming the editorial volume (250+ interactives for GZH since 2023, the CV's figure) that links to **All work**: the Stream in its visible mode, on its own route, off the homepage. The Numbers section goes in the same pass.

## Considered options

- **Drop the archive entirely.** Rejected: the five non-featured projects would lose their only way in from the homepage, and Kevin keeps the editorial record for a future treatment (tracked as a GitHub issue).
- **Park act two behind `columns = 0`.** Rejected: parked code still costs bundle, test time and attention in every scene edit. If the wall comes back it comes back redesigned, so the `columns` parameter goes too.
- **Expand the full list inline under the sentence.** Rejected: once opened it puts 171 rows back on the homepage and grows the Projects chunk the perf baseline caps.
- **A sentence count computed from `embeds.csv`.** Rejected: the CSV lists 162 of the 250+ pieces, so the computed number would understate the work. All work states its own catalogued count instead, so both numbers are true.

## Consequences

- The keyboard and screen-reader path to the four corridor cards returns to ADR 0011's original contract: four visually hidden links, each travelling the camera to its card on focus. The Stream no longer runs hidden alongside the scene.
- The nav loses its "archive" item and stays at four; All work is reached from the sentence.
- ADR 0013's quick suite names `stream` and `frieze-surface`; its list changes with the specs that retire or move.
- The site voice stays lowercase, a sentence-case experiment notwithstanding; project and company names keep their own capitals wherever they appear.
