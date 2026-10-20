# World text clarity

Reference: the user's studio screenshot and the approved sage/oak miniature. Preserve the scene and signs; correct the lettering rather than introduce floating labels.

## Fix

The studio printed text into a fixed 768×384 canvas, then mapped it onto surfaces with different aspect ratios. Its `fillText(maxWidth)` also compressed long headings horizontally. The campus had a separate fixed-aspect implementation. Text was small, thin and filtered without anisotropy at oblique viewing angles.

`signMaterial.ts` now provides aspect-matched static textures, measured font fitting without compressed glyphs, larger bold headings and stronger secondary lettering. The portrait poster uses consistent line sizes. Trilinear mipmaps and anisotropy (up to 8, hardware-clamped by Three) retain detail on angled/floor signs. Basic sign materials retain their authored colors without scene-material tone mapping.

Applied to studio plaques, monitor, arcade, floor directions, campus directory/chapter/project/contact signs, and the landing miniature's studio sign. Real project screenshots also receive anisotropic filtering. The solid window no longer allocates a text canvas.

No dependencies, downloaded fonts, per-frame text updates, geometry or render-budget changes. Texture long edges are capped at 1536px. The studio's seven label textures total 948,526 source pixels, versus 1,892,352 previously (49.9% fewer). This is source-pixel accounting, not peak GPU-memory measurement.

## Verification

- TypeScript and production build pass.
- Studio regression checks pass: 245 rays, surface/material ownership, batching, transforms, triangles, cleanup, texture proportions and size cap. Static batching remains 56 meshes / 44,954 triangles.
- Mobile control/frame-pacing checks pass.
- Browser review at 1280×720: Lite, Balanced and High; Studio/Campus travel; floor and exhibit signs. A 390×844 desktop-hosted viewport checks the phone layout. No captured browser errors.
- Lite after quality switching: sampled 30 fps, 69 draw calls / 81,548 rendered triangles, 1.0 ms CPU/frame on this desktop host. No physical-phone performance claim.
- Before/after Lite overview screenshots saved with the same viewport and camera. Small secondary text remains physically small in the distant room overview, especially on a phone; Photo mode supports closer inspection.

Changes are local and have not been deployed.
