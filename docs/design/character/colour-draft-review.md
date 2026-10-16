# Static likeness colour draft

**Rejected and archived (2026-10-16).** The user canceled this direction and chose to keep the previous animated character. Do not integrate, regenerate or continue this draft without a new request. It was never installed in the live portfolio. The notes below document the discarded experiment.

The hosted Hunyuan3D 2.1 texture-generation button returned a generic Error twice, including after a fresh upload of the approved front reference with Remove Background enabled. The existing shape was successfully exported from the same session with Include Texture off and a 10,000-face target. Its original GLB is retained as `anshul-hunyuan-shape-10k.glb` (180,812 bytes). It contained a connected floor slab, no UVs, no material, no textures and no rig.

## Delivered files

- `anshul-colour-draft-v1.glb`: **405,424 bytes**, 8,564 triangles, 6,142 exported UV vertices, one material and one embedded 1024×1024 WebP atlas. Meshopt compressed; the viewer uses Three's bundled decoder.
- `anshul-colour-draft-v1-obj.zip`: OBJ, MTL and PNG atlas for editors/riggers that do not support GLB/WebP/Meshopt. OBJ UV orientation is flipped to its bottom-left convention.
- `anshul-colour-atlas-v1.png`: lossless editing companion to the embedded WebP.
- `anshul-colour-draft-v1.json`: measured geometry/download statistics.
- `likeness-draft-viewer.html`: rotate/zoom and Front / Three-quarter / Back views, plus unlit colour and studio-lighting comparisons. Local review URL: http://127.0.0.1:9026/docs/design/character/likeness-draft-viewer.html

## Method and limitations

The local pipeline clips the slab at source Y=-0.600 and caps the two resulting shoe contours. It flattens an oversized generated backpack-handle protrusion behind the neck. xatlas unwraps the remaining geometry; per-texel front/rear projection bakes a single colour atlas. Samples that fall on the grey image background are redirected to nearby subject colours, UV charts are padded, and front/rear colours blend around side-facing surfaces. Rear neck/handle colours receive small reference-based corrections. The input reference images are not painted over or altered.

The front reference is the approved A-pose. The rear reference is an additional built-in Imagegen identity-preserve edit using the approved board and front pose; its full prompt is below. The rear image is inferred artwork, not an observed rear photograph of the user.

This preserves the approved colour direction much better than an untextured shape, but it is not an exact reconstruction or a production texture-paint pass. Hands, ears, the rear neck/handle junction and side-view texture detail remain approximate. Reference illumination is baked into the colour map, so scene lighting changes the appearance. Review these areas before rigging. No skeleton, animation, automatic skin weights or foot calibration are included. The live website still loads its previous animated avatar.

## Validation and rebuilding

The exported geometric surface is closed (two incident triangles per welded edge), all normals are unit length, UVs are finite and within the atlas, and the GLB loads with its embedded texture in the real browser loader. Front, rear, three-quarter and lit/unlit views were reviewed. Meshopt compression performs its own byte-for-byte buffer checks.

Rebuild with `scripts/prepare-likeness-draft.mjs` using a Python runtime containing NumPy and xatlas 0.0.11. The helper `scripts/unwrap-likeness.py` handles geometry only. Set `PORTFOLIO_UV_PYTHON` to the chosen Python executable and, if using a temporary install, `PORTFOLIO_UV_PACKAGES` to its package directory. Sharp and the existing Three/Meshopt tooling handle baking and export. The xatlas install is in a temporary folder, not the portfolio package dependencies. ZIP the OBJ/MTL/PNG companions together when handing them to an external rigger.

## Rear reference prompt

Mode: built-in Imagegen, identity-preserve edit. Inputs: `concept-a-anshul-likeness-v1.png` and `anshul-model-reference-front-v1.png`. Output: `anshul-model-reference-back-v1.png`.

Use case: identity-preserve. Asset type: rear camera projection reference for texturing an existing static 3D character.
Image 1 is the approved Campus Workwear character board, with the definitive rear backpack, haircut, outfit and colour design. Image 2 is the definitive front A-pose, proportions and image framing.
Render exactly ONE full-body BACK view of this SAME adult man, looking directly away, head straight, in the same symmetric A-pose as image 2. Match his exact height, width and body proportions from image 2. The tops of his hair and bottoms of his sneakers must occupy the same vertical positions as image 2 in a portrait 1024x1536 composition. Keep camera level and orthographic. Center the body at image centre. Arms angled 35 degrees away from the body, feet slightly apart, hands relaxed. Preserve forest green overshirt, charcoal straight trousers, ivory sneakers and the ivory canvas backpack with tan straps and small brass buckle shown on image 1. Back of head with swept dark sculpted hair, short natural sides; no face visible. Same restrained stylized 3D material language and soft neutral even lighting as image 2, no dramatic shading. Plain light grey background. No text, no extra views, no insets, no objects, no floor plane or cast shadow, no logos. Do not redesign clothing or backpack.

