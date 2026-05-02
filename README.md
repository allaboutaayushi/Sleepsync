# SleepSync

A live, instantly-updating calculator that recommends optimal sleep and wake times based on the body's natural 90-minute sleep cycles, with age-based recommendations from the National Sleep Foundation. Built with **Tailwind CSS** and **vanilla JavaScript** — no build step required.

> **Live demo:** (https://69f608a7ff390fadea3d5bb5--brilliant-entremet-56c326.netlify.app)

---

## Features

- **Three modes** — calculate from a desired wake-up time, a planned bedtime, or "sleep right now."
- **Instant updates** — every keystroke, slider drag, or preset click recomputes results in real time. No submit button.
- **Adjustable sleep latency** — a slider tunes the user's personal time-to-fall-asleep (default: 14 minutes, the population average).
- **Age-based recommendation panel** — enter your age and SleepSync shows the recommended sleep range for your age group, plus whether your selected option falls within it.
- **3D glass orb** — a centerpiece sphere that displays the selected total sleep duration. Tilts in response to mouse movement.
- **Apple-style glass surfaces** — `backdrop-filter` glassmorphism on the main calculator, results, science cards, tips, and FAQ.
- **Rolling digit animation** — when any time changes, individual digits roll vertically (odometer-style) instead of flicker-replacing.
- **Sleep cycle visualization** — a custom HTML canvas chart draws the night's progression through Awake → REM → Light → Deep stages.
- **Light & dark themes** with persisted preference in `localStorage`.
- **Fully responsive** down to 320px wide.
- **Accessible** — semantic HTML, ARIA roles, full keyboard navigation, prefers-reduced-motion respected.

## The math

Each cycle is treated as 90 minutes. The user's fall-asleep buffer is added separately so the wake (or bed) time always lands at the end of a complete cycle.

```
wake mode   →  bedtime  = wake  − fallAsleep − (90 × cycles)
sleep mode  →  waketime = sleep + fallAsleep + (90 × cycles)
```

Suggested cycle counts: 6, 5, 4, 3 (best to minimum).

## Sleep recommendations by age (NSF)

| Group           | Age      | Recommended sleep |
| --------------- | -------- | ----------------- |
| Newborn         | 0–3 mo   | 14–17 hours       |
| Infant          | 4–11 mo  | 12–15 hours       |
| Toddler         | 1–2      | 11–14 hours       |
| Preschooler     | 3–5      | 10–13 hours       |
| School age      | 6–13     | 9–11 hours        |
| Teen            | 14–17    | 8–10 hours        |
| Young adult     | 18–25    | 7–9 hours         |
| Adult           | 26–64    | 7–9 hours         |
| Older adult     | 65+      | 7–8 hours         |

## Project structure

```
sleepsync/
├── index.html        # Markup, semantic sections, font + Tailwind links
├── css/
│   └── styles.css    # Design tokens, glass effects, components, dark mode, animations
├── js/
│   └── app.js        # State, calculator logic, digit roller, orb parallax, age matching
└── README.md
```


## Tech notes

- **Tailwind via Play CDN** — chosen so the project runs without a Node toolchain. For production, swap to the Tailwind CLI build for a smaller, purged stylesheet.
- **No external JS libraries.** All logic is vanilla.
- **The glass orb** is pure CSS — layered radial gradients, multi-shadow inset, and a faint pulse animation. Mouse position is read in real time, mapped to `rotateX/rotateY` transforms via `requestAnimationFrame`.
- **The digit roller** uses persistent DOM nodes per digit position. Only the `--d` CSS variable changes when the time changes, so the smooth `translateY` transition fires instead of a content swap. Every change is forced (no equality check) so even rapid slider drags stay perfectly in sync with the result times.
- **CSS variables for theming.** Dark mode swaps a small set of `:root`-level tokens; every component re-themes from one place.

## Design decisions

- **Restrained palette.** Warm cream / near-black with a single indigo→purple gradient for emphasis. Calm, professional, not a fireworks demo.
- **Calculator first.** It is the project — not a feature buried below a hero. The orb sits beside the headline as a visual anchor, the calculator card takes full width below.
- **Type-driven hierarchy.** Plus Jakarta Sans (display), Inter (body), Sora (numbers), JetBrains Mono (mono detail).
- **Live updates.** No submit button anywhere; the entire UI reacts within milliseconds of any input change. Inspired by ConvertZero's instant unit conversion.
- **Depth on every box.** Layered shadows (inset highlight + contact shadow + ambient drop) give every card a sense of physical weight without being garish.

## License

MIT — feel free to use, fork, or adapt.
