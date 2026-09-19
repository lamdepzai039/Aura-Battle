# Aura Mutation Architecture

## Goal

Aura Mutation is designed as a playable 2D sandbox adventure with an original identity, not a Terraria clone. The project keeps the real-time arena mood of Aura Battle while anchoring the mode in a more authentic sandbox loop: explore, mine, gather, build, fight, collect Aura energy, unlock mutations, and progress deeper into a generated world.

## Core architecture

### World layer
- `createWorld()` generates a deterministic world using a seed.
- Each tile is defined by type, hardness, health, solid state, drops, and metadata.
- Chunk generation keeps world data organized around a chunk grid for future viewport streaming.
- `getTileAt()` and `getChunkAround()` support locality-based mining and rendering.

### Gameplay layer
- `createSandboxState()` initializes the player, inventory, biome, event state, and world spawn.
- `mineTile()` handles digging, break state, and resource pickup.
- `useMutation()` applies Aura mutation actions and consumes energy with cooldown tracking.
- `getBiomeFor()` identifies the current exploration zone based on depth.

### Simulation principles
- Deterministic world generation via seed.
- Data-driven mutation catalog with energy cost and cooldowns.
- Inventory and world changes operate on a plain state model rather than React-only UI state.
- A world-first engine keeps the gameplay loop grounded in actual systems before presentation polish.

## Files

- `src/game/auraMutationSandbox.ts` — deterministic world, chunk, tile, mining, inventory, and mutation foundation.
- `src/game/auraMutationSandbox.test.ts` — regression tests for world generation, mining, and mutation activation.

## Current milestone status

### Implemented foundation
- deterministic world generation
- chunk and tile system
- mining and resource collection
- inventory state
- mutation activation with Aura energy costs
- biome detection and event scaffolding

### Not yet a full sandbox game
- full side-scrolling camera and rendering
- complete building system with placement validation
- full enemy AI and combat loop
- crafting UI and world persistence
- multiplayer sync and server-authoritative validation

This project now has the underlying architecture required to continue into the next milestones without fake placeholder work.
