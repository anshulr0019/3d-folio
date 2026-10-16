# Mobile usability and performance pass

Follow-up: [Studio static rendering](studio-rendering.md) reduces the earlier 212-draw-call baseline to 69 and fixes the Lite frame-pacing tolerance. Measurements below describe the earlier mobile pass.

The previous animated character remains in use. No likeness assets are part of this pass.

## Reference lock and decisions

Build target: the existing Studio/Campus interface documented in `interface.md`. Keep its forest actions, linen reading surfaces, outline icons and real project screenshots. Use the Refero craft guide for touch, focus and modal scrolling. Live Refero research returned `NO_SUBSCRIPTION`; no new visual direction or generated imagery was introduced.

| Decision | Evidence / source | Result |
| --- | --- | --- |
| Compact mobile toolbar and prompts | Existing interface, narrow viewport review | Toolbar falls from 108 px to 62 px; retain location/discovery count and 44 px actions. Audio remains in Explore. |
| Keep each control's owning pointer | Pointer handler review; simultaneous-control unit scenarios | Movement, Run and Jump no longer transfer focus on touch start; another finger's release cannot cancel a held control. |
| Orbit with one finger, pinch with two | Existing Photo mode; touch craft guidance | Capture pointers on canvas, handle cancellation/lost capture, discard unrelated pointers and clear on visibility/focus changes. |
| Put entry/failure dialogs above the portfolio | Existing entrance has a lower stacking context | A portal provides visible loading progress, cancellation and failure recovery; background portfolio becomes inert during entry. Covers chunk loading too. |
| Stop graphics work when unavailable | Context loss/render exception and hidden-tab lifecycle review | Fatal rendering failures cannot resume on visibility; leaving during initialization cannot trigger a late entrance. |
| Freeze scene behind field guide | Existing modal pause behavior | Skip scene updates/rendering while guide is open. Quality changes appear after closing it. |

## Validation

- `npm run typecheck`, `npm run build`, `npm run check:mobile` and `npm run check:avatar` pass.
- Production layout reviewed at 320×568 and 390×844. Toolbar, joystick, actions, field guide and project reading panels fit; no document horizontal overflow. The 320 px project panel is 296×544, with an independently scrolling body.
- 844×390 landscape and 1440×900 desktop use the same responsive layout. Coarse-pointer devices retain touch UI on rotation; the desktop-hosted viewport harness itself does not emulate physical touch hardware.
- Unit scenarios cover movement + Run + Jump together, pointer ownership, unrelated releases, cancellation, hidden-tab reset, pinch scale, one-finger resume after pinch, guide rendering pause and the fatal-context visibility guard.
- A localhost-only proxy delayed the avatar request by 15 seconds: the progress dialog remained visible, Cancel restored the portfolio, and no world canvas remained. Late asset completion did not reopen the world.
- The same temporary proxy returned HTTP 503 for the world chunks: the accessible failure dialog appeared above the portfolio, and View portfolio restored normal navigation. This verifies a real network failure path, not just a mocked message.
- The proxy and viewport harness are temporary QA tools and are removed after review.

## Measurements and limits

The runtime avatar plus shared colour texture remains **1,519,478 bytes**, with the same rig, geometry and animations. Current production world dependency chunks total **798,944 bytes raw / 209,443 bytes gzip**; shared Three.js chunks may already be cached by the desktop hero. These are file measurements, not total page transfer or a first-load timing guarantee.

The developer monitor (Ctrl/Cmd+D inside the world) reports FPS, CPU time per frame, complete render-pass draw/triangle counts, texture/geometry counts and world initialization time. Texture/geometry counts are resource indicators, not GPU memory measurements. CPU frame time excludes asynchronous GPU work.

On this desktop host, the 390×844 Studio at Lite held its 30 fps cap, with a sampled 1.8 ms CPU/frame, 212 draw calls, 81,548 rendered triangles, 13 textures and 216 geometries. Cached local world initialization measured 0.1 s. These are desktop/local-cache observations; they do not establish phone frame rate, real-network loading, battery use, thermal behavior or peak memory. The scene still has substantial draw-call overhead. A physical iOS/Android device check remains necessary before claiming broad mobile performance.
