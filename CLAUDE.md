# cc-outreach-be

Express + TypeScript API for the outreach tracker. See `project-scope.md`, `tech-stack.md`, and `backend-implementation-plan.md` (tick off tasks there as phases are completed).

## Commands

- `npm run dev` — run with `tsx watch`
- `npm run build` — compile with `tsc` to `dist/`
- `npm start` — run the compiled build
- `npm run typecheck` — type-check without emitting

## Conventions

- ESM project (`"type": "module"`): relative imports must use the `.js` extension.
- Read config only through `src/env.ts` (Zod-validated), never `process.env` directly. Add new variables to both the schema and `.env.example`.
- Register every route's path with the registry in `src/openapi.ts` so it appears in `/openapi.json`.
- Routers must be mounted in `src/app.ts` above the OpenAPI generation line.
- Never commit `.env` or put real secrets in `.env.example`.

## Documentation lookup (Context7)

Use the Context7 MCP to fetch current documentation whenever working with a library, framework, SDK, API, CLI tool, or cloud service (Express, Zod, zod-to-openapi, Prisma, Supabase, pino, Apify, Anthropic SDK, Gmail API, Docker, Railway, etc.), even well-known ones. This covers API syntax, configuration, setup, version migration, and library-specific debugging. Prefer it over web search and over memory, since training data may be out of date.

Steps:
1. Call `resolve-library-id` with the library name and what to look up (skip if the user gives an exact `/org/project` ID).
2. Pick the best match by exact name, relevance, snippet count, reputation, and benchmark score. Use a version-specific ID when the version matters.
3. Call `query-docs` with that ID and a specific question, one concept per call.
4. Answer from the fetched docs.

Do not use it for refactoring, general programming concepts, or debugging business logic.

Versions in use: Express 5, Zod 4, `@asteasolutions/zod-to-openapi` 8, pino 10. Match docs to these versions.
