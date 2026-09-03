# Bilingual content is authored in EN and PT, not translated afterwards

The site ships in English and Portuguese, and the i18n system was built in from the first commit rather than retrofitted: "bilingual EN + PT — built in from day one, not retrofitted" (`CLAUDE.md:14`), "built in **en** and **pt** from the first commit" (`README.md:4`). The MVP notes name the rejected path directly — "Implement an i18n system ... from the start, not bolted on later. All content must be authored in both languages" (`CLAUDE.md:182`).

Copy is authored twice, not machine-translated once: the standing rule is "bilingual EN/PT authored, not word-for-word translated" (`docs/superpowers/specs/2026-07-19-webgl-pivot-design.md:53-55`).

## Consequences

Every reader-facing string is a `Bilingual` pair `{ en, pt }` baked into the content types themselves (`src/types/content.ts:19-22`), so a new field is a two-language obligation rather than a key in a locale file. Embed titles are the one deliberate exception — Portuguese only, because the source material is editorial (`CLAUDE.md:156`).

## Source

`README.md:4`, `README.md:57`, `CLAUDE.md:14`, `CLAUDE.md:182`, `src/types/content.ts:19-22`, `docs/superpowers/specs/2026-07-19-webgl-pivot-design.md:53-55`
