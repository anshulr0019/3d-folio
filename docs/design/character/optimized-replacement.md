# Campus Workwear likeness — optimized replacement handoff

Status (2026-10-16): **likeness replacement canceled by the user; retain the previous animated avatar.** The static textured draft was rejected and was never installed. Do not execute the generation or integration steps below without a new request. The Higgsfield request was never submitted. Historical proposal details follow; the measured optimization and loading improvements remain active.

## Locked design

The approved `concept-a-anshul-likeness-v1.png` owns the face and outfit. Preserve swept dark hair, the short beard, forest overshirt, ivory shirt/backpack, charcoal trousers and off-white sneakers. Use adult proportions and sculpted hair; no strand simulation, cloth simulation or separate modeled fabric stitches.

`anshul-model-reference-front-v1.png` is a clean, full-body A-pose derived from that approved board with built-in Imagegen, in identity-preserve edit mode. It contains one figure and no text/insets, making it a more suitable 3D generation input. It remains concept imagery, not a playable mesh. The source photographs remain outside the public website.

## Proposed runtime budget for the replacement

| Asset | Target |
| --- | --- |
| Detailed mesh | 8,000–12,000 triangles, including clothing and backpack |
| Materials | One atlas material if practical; at most two |
| Base color | One 1024px WebP atlas, reduce to 512px if visually acceptable |
| Rig | Humanoid skin; at most four influences per vertex |
| Animation | In-place idle, walk, run and jump; no facial animation or physics |
| Base download | Target ≤1 MB for compressed mesh, rig, clips and color combined; measure before accepting |
| Quality | Preserve identity at every setting; optional shading maps only on High |

These are acceptance targets, not measured results for an asset that does not yet exist. Check silhouette and face in Photo mode and at the normal gameplay camera before removing geometry. A small file can still be expensive to render; measure draw calls, triangles and frame time too.

## Integration requirements

The current Character loader intentionally replaces the source material with the existing avatar's external color texture and FBX UV orientation. A new GLB cannot simply overwrite that file: preserve its own atlas/materials, retarget the movement clips, recalibrate stride speeds, bake grounding and verify foot heights first. Use `scripts/compress-glb.mjs` after export; it retains skin and animation data losslessly and preserves embedded image views.

The connected Higgsfield catalog advertises Meshy `image_to_3d` and `multi_image_to_3d`, but no callable `generate_3d` tool is exposed in this session. The image cost endpoint rejects those models and directs callers to that unavailable tool. No 3D job, paid generation or external likeness upload was submitted. A rigged GLB from that workflow or a modeler is the remaining input for the actual visual replacement.

### CLI route discovered during continuation

Higgsfield's official CLI supports native 3D jobs even though the connected MCP generation tool is missing. Version 1.1.27 is installed in `/private/tmp/portfolio-character-tools`, outside the website's dependencies. Its release checksum was verified by the official installer. The default OAuth callback reaches the Higgsfield sign-in page in Brave; the connection still requires user authentication/consent. No credits or reference uploads have been submitted. `generation-request.json` records the exact proposed 10k-triangle, textured, rigged idle request. Quote its credit cost before generation. Do not treat the configured 1.8m rigging scale as a measured real-world height.

After connection: inspect the available billing workspace, obtain the quote without uploading the reference, confirm the reference-upload destination and any required credit approval, then submit once. Record the job ID before waiting; never restart a submission with an unknown outcome. Review the mesh and face before downloading additional clips or installing it in the site.

Authentication subsequently succeeded through the default callback. The account has one free workspace with 0 credits. The native CLI cost endpoint requires `image_references`, so a valid quote cannot be obtained without the approved reference being uploaded first. Reference-upload authorization remains pending; no generation or purchase was attempted. The earlier instruction to obtain a quote without uploading cannot be completed with this endpoint.

## This pass: measured changes to the current rig

- Runtime GLB: **2,255,008 → 1,450,412 bytes (35.7% smaller)**, plus the existing 69,066-byte color texture.
- Geometry stays at 21,492 vertices / 34,468 triangles; one mesh, one material. This pass reduces download size, not polygon rendering cost.
- Meshopt is decoded locally using Three's bundled decoder; no external decoder request is needed.
- Every geometry/skin/animation buffer view is verified byte-for-byte. Scene, skeleton, accessor and clip definitions are unchanged.
- `npm run optimize:avatar` rebuilds both the retained indexed source GLB and the compressed runtime GLB.
- `npm run check:avatar` validates exact buffers and parses the shipped asset with the browser loader.

## Whole-portfolio loading changes

The existing CSS miniature remains the hero on constrained devices (Data Saver, 2g, ≤4 GB reported memory, ≤4 reported CPU threads, coarse pointers or reduced motion). The decorative Three.js hero is not mounted there, and hovering/focusing world entry does not prefetch the world. Explicit entry still loads the world, whose Auto quality uses the same device budget. Desktop hero rendering is capped at 60 fps. The hero releases its renderer when world entry begins, so it does not compete with the fullscreen scene. Reduced motion uses native scrolling rather than Lenis interpolation.

The regular portfolio retains project details, skills, education and contact without entering WebGL. This is how visitors with unsupported graphics can still access the work; universal 3D support or universal 60 fps is not promised.

## Validation

- Production build and TypeScript checks pass.
- Asset verification checks every buffer and confirms that the real GLTFLoader/Meshopt decoder can parse the runtime file.
- Existing movement, quality-race/cache, asset-failure, disposal, jump and floor-grounding checks pass against the compressed asset. The sampled blended floor range remains approximately -0.0068 to 0 world units.
- Device-budget checks cover capable desktop, absent optional hints, low memory/CPU, coarse pointers, reduced motion, Data Saver, 2g/slow-2g, SSR, subscription updates and cleanup.
- Browser review confirms Studio/Campus travel, Lite/High quality switching, movement/jump and one active canvas after world entry. The former deprecated shadow-map setting now uses the supported PCF equivalent already selected by Three internally.
- No physical low-end-phone benchmark or universal frame-rate claim. Compression reduces transfer, not the current rig's triangles or skinning cost.
