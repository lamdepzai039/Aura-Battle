# Aura Battle Audit and Vertical-Slice Assessment

## 1. Current architecture

The project is a Vite + React + TypeScript app with a split between:

- App shell and route-like state transitions in `src/App.tsx`
- Game logic under `src/game/`
- UI and screen components under `src/components/`
- Utility stores and persistence modules under `src/utils/`
- Express-based backend in `server/server.js`

The app is organized around a larger “Aura Battle” competitive experience, while the 2D sandbox prototype sits inside the existing mutation flow rather than as a wholly separate app. The project already includes:

- camera challenge orchestration
- scoring, leaderboard, profile, economy, and match flow
- guild/chat/event systems
- a mutation arena and 2D sandbox prototype
- local persistence stores for room and progression data

This is a solid base for incremental expansion because the architecture already separates UI, core logic, and state utilities.

## 2. Existing working features

### Production-ready enough for the current slice

- Vite build system runs successfully with TypeScript and React
- App navigation and phases are wired through `App.tsx`
- Play mode selection already supports local, mutation, room, and online-ready flows
- Camera-based challenge flow remains available without breaking the rest of the app
- Mutation rules and arena logic are already implemented in `src/game/auraMutation.ts` and `src/game/auraMutationArena.ts`
- Sandbox prototype includes world generation, mining, loot collection, enemies, and player movement logic in `src/game/auraMutationSandbox.ts`
- Mutation map UI exists in `src/components/MutationMap.tsx`
- Existing utility systems such as event store, player profile, leaderboard, shop, slots, guild, and room logic are still present

### Vertical-slice systems already in place

- deterministic world seed
- terrain generation with biome labels
- resource drops and mining behavior
- basic enemy updates and damage response
- local aura mutation energy and cooldown logic
- a playable 2D map prototype with keyboard controls

## 3. Incomplete features

The project is not a complete Terraria-style game yet, and the remaining gaps are expected for a vertical slice:

- no full inventory crafting UI beyond the prototype systems
- no persistent save schema with migration support yet for the sandbox world
- no robust multiplayer server-authority layer beyond local/offline room fallback behavior
- no robust mobile touch controls beyond the existing web-oriented layout
- no full progression tree or end-to-end save flow for the sandbox map
- no polished enemy variety beyond a few early sandbox prototypes
- no dedicated world chunk streaming and region loading architecture yet

## 4. Broken or missing features

At the audit stage, the main risks are not hard failures in the build/test pipeline but feature gaps and validation assumptions:

- the arena/sandbox logic is implemented but not exposed consistently as a first-class mode in the UI
- “sandbox” and “mutation” are close enough that they can feel conceptually merged without explicit user-facing clarity
- online/multiplayer features remain intentionally local fallback flows and should be labeled as such
- some proposed systems are designed but not fully integrated into the broader app loop, especially around persistence and progression

## 5. Dependencies

Key dependencies the app already relies on:

- React 19 and React DOM
- Vite for development and bundling
- TypeScript for strong typing
- Framer Motion for interface transitions
- Express + WebSocket server for local room simulation / network fallback
- MediaPipe vision stack for camera challenge processing
- Vitest for existing logic tests

The dependency list is reasonable and does not currently suggest a need for a major replacement.

## 6. Performance risks

The biggest performance risks are not from the build itself but from long-lived browser state:

- large world tile arrays and repeated collision checks in sandbox logic
- React state updates per animation frame in the 2D map prototype
- camera/world recalculation on every frame if more entities are added
- growing event, inventory, and profile state without normalization

The current setup is acceptable for a small 2D prototype but should move toward viewport-aware updates and data-localized world chunks before scaling to larger maps.

## 7. Reusable components and modules

The most reusable existing building blocks are:

- `src/game/auraMutationSandbox.ts` for world generation, mining, resources, enemies, and mutation hooks
- `src/game/auraMutationArena.ts` for time-limited aura contest logic
- `src/components/MutationMap.tsx` for the 2D sandbox layer and input loop
- `src/components/PlayMode.tsx` for mode selection and room fallback UI
- `src/utils/*` modules for progression, events, guilds, chat, rooms, and economy
- the challenge and scoring stack under `src/game/` and `src/scoring/`

These modules are clean enough to build on without starting from scratch.

## 8. Recommended implementation plan

1. Keep the existing camera and competitive match systems intact.
2. Treat the mutation sandbox as the main local single-player vertical slice.
3. Make the mode explicit in the UI so it is discoverable and not hidden behind a generic mutation flow.
4. Add a clear save schema and versioning layer once the map loop is stable.
5. Expand inventory/crafting systems around the same data model used by mining and drops.
6. Add one more enemy plus one event and one mutation archetype expansion before moving to deeper world-generation work.
7. Only then design the server-authority boundary for multiplayer.

## 9. Potential compatibility problems

- Browser-only local state is still being used where an online authoritative server would eventually be required.
- The room and lobby flow is intentionally local/fallback-only; this is a design decision, not a bug, but it must remain labeled honestly.
- The 2D sandbox logic is a prototype and should not be treated as a production-ready world engine yet.
- React state updates tied to animation timing can become noisy when scaled to larger maps or more entities.

## 10. Current verdict

The project already contains the highest-priority playable slice: a small but real 2D sandbox prototype with world generation, movement, mining, aura mutation, enemy interaction, and local progression logic. The main remaining work is not a rewrite—it is explicit mode exposure, better documentation, and disciplined expansion into inventory, save/schema, and progression architecture.
