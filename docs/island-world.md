# Connected island

The studio and outdoor world now share coordinates and stay in the scene together. Walk through the open front or side to explore. Buildings retain solid collisions; the rectangular campus boundary is removed.

Use the Island map button for seven destinations. Melody pond responds to stepping on each stone, or its interaction button. The wind workshop toggles lanterns and its sails. The lighthouse enables a rotating beam and boat signals. Byte follows outdoors and returns to the desk indoors. Discoveries are saved locally when browser storage is available.

The ocean uses a single following surface. A board appears past the shore; crossing the 256-unit ocean period translates player and camera together. This is a finite authored island surrounded by looping water. Geometry does not accumulate during travel. Static meshes are batched, meadow and reeds instanced, and ripples use a fixed pool. Lite freezes water shading; reduced motion also stops beacon and windmill rotation.

Validation: TypeScript and production build passed. Existing mobile-control and studio-rendering checks passed. check-island.mjs covers ocean wrapping in both axes, camera-offset continuity and destinations remaining on land. Desktop and narrow browser previews checked, including map travel and lighthouse touch activation. No real-device performance guarantee is implied by these checks.

Future work: terrain elevation and climbable lookout, a vehicle, more personal stories, and broader real-device profiling. The current landscape is flat and the lighthouse is operated from its base. No deployment or push is authorized until the user explicitly approves it.

## Edge and rendering polish

Enabled canvas multisample antialiasing and removed High's full-screen bloom chain; illuminated objects retain their authored bright materials. Lite now renders at native pixel ratio where its existing pixel cap allows. The shoreline uses 192 segments and a sand skirt connecting the lawn edge to the beach. Outdoor static batches are split into 18-unit cells so distant scenery can be culled. Shadow rendering runs at up to 30 Hz while movement/rendering remains at 60 Hz in Balanced/High.

Balanced/High adapt resolution after two slow sampling windows (below 50 FPS), down to 70% of their initial ratio. Recovery requires four stable windows at 58+ FPS. Manual quality retains its detail setting. This protects against sustained load, not isolated shader-compilation stalls or all possible device limitations.

Same narrow preview/project-walk sample: High before 60 FPS, 2.2 ms CPU, 207,916 rendered triangles, 50 textures; after 60 FPS, 0.8 ms CPU, 178,940 triangles, 26 textures. Spatial batching trades additional draw calls for fewer off-screen triangles; shadow frames differ from non-shadow frames. These are individual developer-monitor observations, not controlled hardware benchmarks. Build, TypeScript, studio/mobile/island checks and render-budget hysteresis tests passed. Still local; no push or deployment.
