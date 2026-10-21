# Pettly project instructions

Before working on any requested change, read `DESIGN.md` and the relevant module documents in `docs/`. The design's hexagonal architecture, feature boundaries, DDD and English OpenAPI documentation are mandatory.

Update `DESIGN.md` when architecture, implementation status or decisions change. Keep `docs/<module>.md` current with each module change, including its purpose, boundaries, contracts, dependencies, invariants and verification. Describe implemented behavior separately from plans.

Use pnpm for the monorepo. Do not modify unrelated applications or shared development databases/Redis keys. Use isolated infrastructure and project/environment-specific Redis prefixes for tests.
