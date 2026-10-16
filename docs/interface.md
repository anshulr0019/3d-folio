# Interface pass — Part 5

Follow-up: [mobile usability and performance validation](mobile-performance.md) records the compact toolbar, touch input fixes, cancellable loading and recovery checks.

Build target: the approved studio/campus and existing portfolio landing page. Preserve forest ink, light linen surfaces, restrained borders, real project screenshots and readable sans typography. This is a direct implementation of the approved interface pass.

| Decision | Reference / role |
| --- | --- |
| One responsive toolbar; settings grouped in the field guide | Existing portfolio navigation and Bruno Simon's grouped options; keep the 3D scene unobscured. |
| Forest for primary actions, linen for reading surfaces, sage for secondary surfaces | Existing studio/campus palette. No purple glow in portfolio controls. |
| One consistent 24px outline icon set | Refero icon craft guidance; icons describe actions and inherit text color. |
| Quiet, stationary interaction prompts | Refero motion guidance; frequent prompts should provide feedback without continuous bouncing. |
| Focus enters dialogs, Tab stays inside, Escape closes and focus returns | WAI-ARIA modal dialog pattern and Refero focus guidance. |
| Actual screenshots lead project panels | Existing exhibit media; preserve product evidence rather than replacing it with decorative art. |
| Direct contact links and copy-email feedback | The existing contact form has no sending backend; remove its false success state. |

Sources: https://bruno-simon.com/ and https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/. Refero live research previously returned NO_SUBSCRIPTION; bundled craft/icon/motion references and the approved existing visual target are used here.

Scope: world toolbar, field guide, settings, prompts, photo controls, touch controls and reading panels. The arcade's game rendering retains its own visual identity.

Validation: production build and TypeScript checks pass. Reviewed desktop and narrow/phone viewports down to 327 CSS px; no horizontal overflow in toolbar/case panels. Verified project pagination and image loading, menu input isolation, modal focus trapping/Escape, contact copy feedback, quality switching, travel, world interaction, terminal commands, photo entry/exit, and pointer joystick movement/release. On-device multi-touch has not been hardware-tested.
