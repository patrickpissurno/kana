## Workspace:
- root: ./ (monorepo) 
- web: ./packages/web -> main app

## Stack:
- bun 1.4.2
- react-router v8
- tailwindcss 4
- vite 8
- vitest 4
- typescript 7
- date-fns 4
- zod 4
- shadcn ui

This is an SPA. SSR is disabled.

## Rules:
1. Be concise
3. Not allowed to add dependencies
4. Do NOT make assumptions, when in doubt ASK instead
5. Always begin by interviewing for more context, as necessary
6. Never use npm, use bun instead with only the commands provided below
7. Test coverage must be 100% across all 4 metricts (functions, lines, branches, statements)
8. Tests should pass coverage requirements even when ran in isolation (single file). It's okay if the runner exits with a -1 due to other files not being mocked, as long as the tests for the file being tested pass.
9. Avoid test cases that don't contribute to coverage
10. ALWAYS use uncontrolled elements for forms

## Testing Methodology:
Goal is to exercise React components. Tests should be isolated by component (one file per component) and parent components should focus on integration (e.g. view transitions).

## Commands:
- `bun --filter web test <filename>.test.{ts,tsx}` (run test in isolation)
- `bun --filter web check` (run all static checks excluding tests)
- `bun --filter web test` (run all tests - only use when all else has passed)
- `bun shadcn add <component>`

Gotchas:
- Never run just `bun test`, as it will try to use the bun test runner instead of vitest

## Architecture & Quirks:
- **Linting & Disables:** NEVER use a full `eslint-disable`. Do not disable rules (even single lines) unless absolutely necessary, and if you feel the need to do so, you MUST pause and ask the user for permission with justification first. Always attempt to "do it properly" (e.g., using semantic constants for magic numbers/strings in test files).
- **Precommit Checks (`lint-staged`):** Prefer `bun --filter web check` over `bun precommit`
- **TypeScript in Tests:** Avoid using `as any`. For component props, import `Route` from `./+types/route` and use safe casts like `as unknown as Route.ComponentProps['loaderData']`. To prevent `strict-void-return` errors when mocking functions, provide explicit type parameters (e.g. `vi.fn<() => void>()` instead of just `vi.fn()`).
- **Component Test Isolation & Mocking Philosophy:** Do NOT aggressively mock internal child components. Each component should have its own `.test.tsx` file for fine-grained assertions. Parent tests (like `route.test.tsx`) should rely on the actual rendered UI to verify high-level state toggles (e.g., checking for specific CTA buttons) and only mock dependencies when absolutely necessary to exercise a code path or resolve missing context (e.g., wrapping in `<MemoryRouter>`).
- **Testing Hidden UI (Happy-DOM & Tailwind):** Happy-DOM does not evaluate CSS rules, which means testing library queries like `getByText` will match elements even if they have Tailwind's `hidden` class applied. To reliably test conditional rendering or view transitions, assert against elements that are entirely unmounted from the DOM (e.g., a conditionally rendered button) rather than checking for text inside a visually hidden container.

