# Bilingual content is authored in EN and PT, not translated afterwards

The site ships in English and Portuguese, and the i18n system was built in from the first commit rather than retrofitted: "bilingual EN + PT — built in from day one, not retrofitted" (`CLAUDE.md`), "built in **en** and **pt** from the first commit" (`README.md`). The pre-revamp MVP notes named the rejected path directly: "Implement an i18n system ... from the start, not bolted on later. All content must be authored in both languages".

Copy is authored twice, not machine-translated once: the standing rule is "bilingual EN/PT authored, not word-for-word translated" (`docs/superpowers/specs/2026-07-19-webgl-pivot-design.md`).

## Consequences

Every reader-facing string is a `Bilingual` pair `{ en, pt }` baked into the content types themselves (`src/types/content.ts`), so a new field is a two-language obligation rather than a key in a locale file. Embed titles are the one deliberate exception — Portuguese only, because the source material is editorial (`docs/architecture.md#content-model`).

## Source

`README.md`, `CLAUDE.md`, `src/types/content.ts`, `docs/superpowers/specs/2026-07-19-webgl-pivot-design.md`
