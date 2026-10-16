# Character pass — Part 4

Current decision: keep the previous animated character. The user rejected the personal-likeness draft and canceled that replacement on 2026-10-16. Do not integrate or resume the likeness experiment without a new request.

The lossless compression and constrained-device loading improvements remain in place; see [optimization record](design/character/optimized-replacement.md). The runtime loads `avatar.meshopt.glb` (1,450,412 bytes); `avatar.glb` below is retained as the uncompressed indexed source for verification. The [rejected static likeness draft](design/character/colour-draft-review.md) is archived for history and was never installed as the playable avatar.

The existing rig is the visual target for this pass. The studio/campus material direction remains the primary reference; Bruno Simon's portfolio informs the consistent identity across the experience. The Refero motion guide informs short, interruptible transitions and restrained feedback. This pass does not add a new face, outfit, or personal likeness.

| Decision | Reason / source |
| --- | --- |
| Same rig in every quality setting | A quality setting should preserve the visitor's character identity. |
| Match animation cadence to travel and blend walk/run continuously | Existing clips contain measurable root displacement; use that calibration instead of an arbitrary playback cap. |
| One jump per press, controller owns height | Prevent repeated held-key jumps and animation/physics lift stacking. |
| Keep the contact shadow; remove additive dust | Match the restrained miniature studio/campus direction. |
| Resolve visuals after collisions | Stop the running animation and footsteps when scenery blocks movement. |

## Assets and quality

`npm run optimize:avatar` rebuilds `public/models/avatar.glb` from the retained Idle/Walking/Running/Jumping FBX sources, plus three WebP textures from the original character PNGs. It uses the existing Three.js tooling and Sharp provided by Next.js.

The script welds vertices only when position, normal, UV, bone indices and bone weights match. Geometry falls from 103,404 duplicated vertices to 21,492 indexed vertices; all 34,468 triangles remain. The rig is 2,255,008 bytes, with a 69,066-byte shared color texture. High optionally adds a 534,066-byte normal map and 10,494-byte roughness map.

Lite/Balanced/High use identical geometry and animation. Lite saves rendering cost through the existing lower resolution, 30 fps, and reduced scene effects; this is not a separate low-polygon avatar. High shading maps load once, remain cached during the session, and are released when leaving the world. Optional map failures leave the base character usable. A base-asset failure displays a simple fallback; changing quality retries the shared asset.

## Animation and grounding

The asset pipeline removes X/Z travel only from the hips track, stores the original walk/run speeds as metadata, and samples grounding corrections at 60 Hz. Runtime applies the existing 2.4-unit character height and advances locomotion by distance with a shared walk/run phase. Idle/walk/run/jump weights remain normalized.

A maximum of 96 foot vertices corrects grounding during blended poses. The controller owns the jump arc (7.2 initial speed, 24 gravity, 1.08-unit peak and 0.6-second airtime), with a small landing compression. This is foot-height correction, not full foot IK or foot locking. Some horizontal sliding and imperfect limb poses remain possible in the source animations.

The current build expects the source Mixamo joint names and four named clips. A replacement character needs a matching rig/retargeted clips and regenerated assets; adding a convincing hoodie or sneakers requires geometry changes.

## Review

Open the local preview, refresh, and enter the world. Walk, sprint with Shift, jump with Space, and hold Space through landing. Compare the three quality settings and walk into a wall or campus planter. Use Photo mode (P) to inspect the character and scroll to zoom. Review both Studio and Project district through Explore & settings.
