[![react](https://img.shields.io/badge/React-20232A?&logo=react&logoColor=61DAFB)](https://react.dev)
[![vite](https://img.shields.io/badge/Vite-646CFF?&logo=vite&logoColor=white)](https://vite.dev)
[![typescript](https://img.shields.io/badge/TypeScript-3178C6?&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![tailwind](https://img.shields.io/badge/Tailwind-06B6D4?&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
# wizard
The BLE Wizard Standalone Demo (wizard)

The design bench for Bible Game: new work is shaped here on the webapp's genuine Play page, mirrored in Figma, then
built in the webapp (`../webapp`), which is its final home.

## Run

```
npm install
npm run dev        # http://localhost:5180
```

| Address | Shows |
|---|---|
| `/` | the landing over today's game (the practice day, Psalm 127) |
| `/#/play` | today's game: the first-visit tutorial once, then the round with its notes |
| `?tutorial` | the tutorial and the round's notes again, once they've been seen |
| `?known` / `?known=0` | the landing's last screen for a visitor whose account we know (Play, Log in), or forget it |
| `#/story`, `#/first-run`, `#/explainer`, `#/welcome` | earlier explorations, kept to compare |

## What comes from the webapp

The Play page, the tutorial and the landing are the webapp's own files, copied here unchanged:

```
python3 scripts/sync-play.py --dry   # same / DIFFERS for each copied file
python3 scripts/sync-play.py         # copies files the wizard doesn't have yet
```

It follows the imports from the Play page (`app/play/[game]/game.tsx`), the tutorial
(`app/play/[game]/tutorial/tutorial.tsx`, `round-tips.tsx`) and the landing (`app/home/landing-overlay.tsx`). A file
that differs is reported, never overwritten: copy it across in whichever direction is right. What needs Next, the
services or sign-in is stood in for: Next, SWR, HeroUI and Sentry in `src/web-shims` (aliased in `vite.config.ts`), the actions
and sign-in at their own paths under `src/core`. The Bible's structure (`core/config/bible.json`) is the webapp's too,
shipped with both apps, so nothing here needs the passage service for it.

The wizard's own host is `src/demo/onboarding.tsx` (the webapp's are `play-host.tsx` and `home-host.tsx`): it puts the
landing over the page, runs the tutorial on a demo round, and mocks what the webapp does for real (Sign up and Log in as
toasts, `?known` for a known account).

## Gridmap

`@project-gridmap/library` is pinned exactly, as in the webapp (0.2.1). The tutorial moves and hears the map only
through the library's API (`Gridmap.from`, `glideTo`, `cameraChange`, layers above the veil).
