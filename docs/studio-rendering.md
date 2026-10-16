# Studio static rendering pass

Scope: Studio scenery. Keep the existing character, scene layout, materials, surfaces, text, shadows, collision definitions and interactions. Campus geometry is not batched in this pass.

## Implementation

`Studio.ts` now reuses identical materials and primitive geometry. `batchStudio.ts` runs once at the end of Studio construction, before World adds physics props, collectibles, the companion and lights.

- Four or more copies of a shared geometry/material use an `InstancedMesh`; 111 authored pieces use instances in this scene.
- Other compatible opaque geometry is baked into its interaction owner's local space and merged by material, attribute layout, shadow flags, layers and render order.
- Workstation/shelf interactive meshes stay intact. Lounge and arcade batches stay inside their interactive groups, preserving raycast ownership.
- Transparent contact shadows, window-light patches and independently fading zone rings retain their original meshes and sorting.
- Bounds are recomputed for culling. Unused source geometry is released; teardown also releases instance buffers through `InstancedMesh.dispose()`.
- `buildStudio(..., { batchStatic: false })` is a regression-test comparator. Production uses batching by default; no visitor-facing setting was added.

The scene remains a miniature room with the same 44,954 static triangles. Merged pieces share a larger culling bound, so a close Photo-mode view can submit some geometry that was previously culled individually. This trades finer per-piece culling for fewer submissions in the normal room overview.

## Frame pacing correction

The existing 1 ms scheduling tolerance could accept a frame just before its deadline. Modulo rounding then left the previous deadline unchanged, allowing the same slot to render again. A regression at 16.5 ms host intervals reproduced 315 renders instead of approximately 297 over 600 callbacks.

The loop now advances by at least one scheduled slot whenever it accepts a frame. Simulation still uses actual elapsed time with the existing 50 ms clamp. Tests cover exact and slightly jittered host intervals; Lite stays within one render of its 30 fps target. This correction also applies to the shared campus loop.

## Production comparison

Same 451×829 browser viewport, default Studio overview, original character, Lite quality:

| Measurement | Before | After |
| --- | ---: | ---: |
| Full rendered draw calls | 212 | 69 |
| Rendered triangles | 81,548 | 81,548 |
| Live geometries | 216 | 70 |
| Live textures | 13 | 13 |
| Sampled CPU frame cost | 1.7 ms | 1.5 ms |

Draw calls fall **67.5%**. CPU values are individual desktop-host samples, not a statistical benchmark or GPU timing. Lite's corrected cap was observed at 30 fps. Cached local initialization sampled 0.1 s before and 0.2 s after; batching adds one-time construction work rather than reducing asset downloads. No physical-phone, battery or thermal claim is made.

The controlled static-only comparator goes from 199 meshes to 56, with the same triangle count. Final typed geometry/instance buffers occupy approximately 1,720,140 bytes, compared with 3,885,308 bytes if the authored meshes each retain their original separate buffers. These estimates exclude textures, GPU/driver overhead and peak construction memory. The unbatched test comparator already shares primitive geometry, so its unique-buffer count of 1,437,900 bytes isolates batching rather than representing historical production memory; merging increases that shared-only baseline while sharply reducing submissions.

## Validation

- `npm run check:studio`: 245 surface/interaction rays verify hit positions, normals, material/texture identity, shadow flags and interaction ownership. Also verifies transformed roots, bounds, triangle count, zones, independently mutable markers and instance-buffer cleanup.
- `npm run check:mobile`: touch ownership, pinch handling, hidden-tab reset, jittered Lite frame cap, guide pause and fatal-context recovery guard.
- `npm run check:avatar`, TypeScript and production build pass.
- Before/after Lite screenshots reviewed at identical viewport/camera placement. Mean per-channel difference was 0.059/255; only 0.076% of channels differed by over 10/255, including moving props/idle poses. No material or layout drift was visible.
- Live workstation, lounge and arcade clicks open the expected content. High shading and shadows, quality changes, movement/jump and Studio/Campus travel are reviewed in the browser.
