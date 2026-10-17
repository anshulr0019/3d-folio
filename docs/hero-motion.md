# Hero entrance — part 1

The approved direction is a short, coordinated entrance within the existing hero.
Keep the current typography, three headline lines, palette, layout and 3D preview.
The headline leads; supporting copy and actions follow.

Motion reference: Refero's bundled `references/motion.md` guidance on hierarchy,
ease-out entrances, smaller mobile movements and reduced-motion alternatives.
Live Refero research was unavailable because the connected subscription was inactive.
This change extends the existing design rather than introducing a new visual direction.

| Decision | Reason |
| --- | --- |
| Three masked line reveals, staggered by 80ms | Establish reading order without animating individual letters. |
| 800ms total on desktop, 700ms on mobile | Complete the introduction quickly; avoid a loading sequence. |
| CSS transforms and opacity, no additional assets or dependencies | Works with server-rendered HTML, without a hydration-triggered hiding flash. |
| No animation outside `prefers-reduced-motion: no-preference` | The default is visible, stationary content. |
| Clear entrance on focus or pointer press | Actions and text selection remain available immediately. |
| Mark entrance consumed when entering the world | Returning to the portfolio does not replay it. |
| Backwards fill only | Restore ordinary styles after playback; no permanent animated transform. |

Review: reload `/` to see the entrance. On mobile the distance and duration shrink.
Tab into the hero during playback to reveal everything immediately. Enter and exit
the 3D world to confirm the entrance stays consumed. With reduced motion enabled,
all hero text should be visible immediately.

Validation: `npm run typecheck` and the production build pass. Browser checks at
1280px and 320px confirmed the line stagger and no horizontal page overflow on
fresh load. A paused 200ms sample showed each desktop line at a different reveal
position. Keyboard focus cleared the entrance, and entering/exiting the world
preserved `data-intro="false"`. No browser JavaScript errors were recorded.
Reduced-motion behavior is defined by the CSS media query; OS preference switching
and physical phone performance were not tested in this pass. The temporary review
page was removed after checking.

## Remaining landing-page motion

Continue the same existing-design reference lock and bundled Refero motion guidance.
The 3D preview remains the main visual; motion follows reading and navigation order.

| Decision | Source / purpose |
| --- | --- |
| Desktop hero copy moves up 36px; preview drifts down 28px | Approved layered hero exit, restrained depth within the existing layout. |
| Offscreen section content rises 18px once (8px on mobile) | Approved section reveals; hierarchy and readable content. Already visible content stays visible. |
| Project art shifts 24px each way within the existing horizontal track | Approved artwork depth; ScrollTrigger container animation keeps it tied to the existing showcase. |
| The four existing journey rails draw sequentially and their numbers highlight | Approved timeline; preserve the existing four-column / two-column layout. |
| Arrows shift 3px, links underline, buttons respond on press | Refero feedback timing: 120–200ms, no delayed interactions. |
| JS scroll effects only run with no motion preference; desktop parallax requires a fine pointer | Approved mobile / reduced-motion constraints. Default content remains readable without JavaScript. |
| Revert all timelines and event handlers on world entry and breakpoint changes | Existing portfolio/world lifecycle; avoid duplicate observers and stale transforms. |

Implemented in `src/components/usePortfolioMotion.ts`, `SelectedWork.tsx` and the
portfolio CSS. No dependencies, images or 3D model assets were added.

Additional validation:

- TypeScript and the final production build pass; browser error logs are empty.
- At 1280px, hero copy and preview move in opposite directions. The horizontal
  showcase retains one pin, and artwork shifts independently inside each card.
- At 320px, there is no page overflow, no pin, and hero / artwork transforms reset
  to `none`. Journey rails progress through the two-column layout.
- Filtering to Web apps / creative / all work produces 2 / 1 / 3 cards, with the
  pin removed for the single-card view and rebuilt for the multi-card view.
- The journey has partial rail fills midway through scrolling and fills all rails
  at the end. It reverses when scrolling back, including after filter changes.
- Entering and leaving the world restores the portfolio and its filters. Anchor
  navigation reveals the About content without leftover opacity or transforms.
- A recreated project pin originally measured after the journey trigger and left
  downstream offsets short by the pin's scroll distance. `refreshPriority: 1`
  measures the project pin first. A root ResizeObserver schedules refresh after
  layout changes; both observer and pending frame are cleaned up on exit.

Reduced-motion effects are disabled by CSS / GSAP media queries. OS preference
switching and physical phone performance remain unverified. Temporary diagnostic
pages and attributes were removed after checking. These changes are local; they
have not been deployed to Vercel.
