# The card is the object

**Status:** accepted (grilling, 2026-09-04). Supersedes the 2026-09-03 spec's Q6 and Q17 and narrows ADR 0010's `frontIndex` clause.

The shipped scene kept a project's name, meta and link as a DOM overlay projected onto the settled card every frame, for crisp text and a native link. The owner rejected it on principle: the information belongs on the card, in the 3D environment, not on an HTML plane recomputed over it. So the **caption** is drawn on the card's body band as a texture rasterised at its on-screen size, the card is one pressable object (R3F pointer events, lift on hover, click navigates), and the only DOM left is the visually-hidden skip-link index of four links, which is the whole keyboard and screen-reader contract. Text-as-texture is normally the wrong call; here it is deliberate, and the legibility rule (caption name ≥ 12 px on screen on every viewport) is what makes it acceptable.

## Consequences

- **No React state is driven by scroll at all.** `frontIndex` existed only to feed the overlay and the SR heading; with them gone it is deleted rather than memoised around. Its re-render was the flicker the owner saw at every settle midpoint (the Corridor registration effect tore every mesh down on each new `covers` array). The frame loop writes `data-slot`/`data-overture`/`data-registrations` imperatively on the canvas wrap for tests; nothing reads them in React.
- The a11y path no longer tracks scroll: a screen reader gets four links and a static heading, not "the current project". That is a deliberate trade for zero per-frame DOM work.
- The title and the overture line are the two objects outside the fog and outside the post-processing composer; captions are inside both, because they belong to the card.
- Playwright cannot click the card by selector; the scrub tests click the canvas at the card's projected centre and read `data-slot`.
