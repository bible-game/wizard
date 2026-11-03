# Wizard

A standalone, lightweight demo of the Bible Game landing page with How it works played as a practice round, for mapping
out the new-player flow before any of it goes into the webapp.

```bash
npm install
npm run dev   # http://localhost:5180
```

## Deploying

Every push to `main` builds the demo and publishes it to GitHub Pages (`.github/workflows/deploy.yml`), at
https://bible-game.github.io/wizard/. Once, in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
The build links its assets relatively, so it works under `/wizard/` as well as at a root.

## What's here

- `src/demo/`: the demo itself.
  - `landing.tsx`: the hero, the rail, the tour, and the sign-up form at the end (then Play today's chapter).
  - `tour.tsx`: the four steps as one pinned screen; each step slides up over the last as the scroll reaches it. Also
    `useStepTips`, a step's wizard tooltips.
  - `rail.tsx`: the numbered steps with their fill bars, and the key figure (the stars fly into it).
  - `play-step.tsx`: 01 Play, the practice round (Jonah 1) played by the scroll on the real map: five guesses, one star, then Share.
  - `read-step.tsx`, `study-step.tsx`, `stats-step.tsx`: 02 Read (the whole chapter, then mark as read), 03 Study (four
    questions, a star each, then a summary) and 04 Stats.
  - `sign-up.tsx`: the sign-up form, with the app's fields.
  - `fly.ts`: a star flying into the key figure. `tooltip.tsx`: the tooltip and where it goes.
  - `practice.ts`: the practice chapter (Jonah 1), its opening verses and the Study question.
  - `bible.json`: the Bible's structure, copied from `deployment/configuration/0_LOCAL`.
- `src/app/`, `src/core/`, `globals.sass`, `play.sass`: copies of the webapp's files (hero, Gridmap, clue, guess tiles,
  closeness, scoring, ruled-out, theme, ground), at their webapp paths so their imports are unchanged. They are copies:
  changes here don't reach the webapp, and the webapp's later changes don't reach here.

## Behaviour

- No services and no stored data: everything lives in memory, so every load starts fresh. **Reset demo** (in the footer)
  starts over.
- The visitor doesn't play the round: scrolling plays it. They earn one star from it, and one more for a right answer in
  Study, then claim them at the end.
- Buttons that would leave the landing page (Play, Read, Study, Create account, Log in, the menu) show where they'd go.
