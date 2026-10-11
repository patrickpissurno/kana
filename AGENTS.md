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

## Architecture Decisions & Constraints:
- **Persistence (IndexedDB):** Stored in `kana_db` (v1) under `quiz_events` object store (`id` auto-increment primary key, indexed by `by_glyph` and `by_timestamp`). Event-sourced ledger records `{ id, glyph, timestamp, result }` where result is `'correct' | 'wrong' | 'skipped'`. On quiz load, a `'skipped'` entry is recorded and later updated upon answer submission.
- **Kana Dataset (104 Entries across 4 Sections):**
  1. *Gojūon (五十音)*: 46 basic characters (あ–ん)
  2. *Dakuten (濁点)*: 20 voiced characters (が–ぼ)
  3. *Handakuten (半濁点)*: 5 semi-voiced characters (ぱ–ぽ)
  4. *Yōon (拗音)*: 33 contracted digraphs (きゃ–ぴょ)
- **Grid Layout & Sorting:** Rendered in 4 sections with section headings. Glyphs within each section are sorted by user score descending (highest to lowest), falling back to a random shuffle on page load.
- **Romanization Standard:** Strict Revised Hepburn (e.g. し=`shi`, ち=`chi`, つ=`tsu`, ふ=`fu`, じ=`ji`, ぢ=`ji`, ず=`zu`, づ=`zu`, を=`wo`, ん=`n`, しゃ=`sha`, じゃ=`ja`). Case-insensitive and trimmed.
- **Post-Quiz Flow:** Displays immediate visual feedback (success or error revealing canonical romaji) with an uncontrolled form and a "Continue" button navigating back to `/hiragana`. No direct retry or cooldown.
- **Theme & Viewport:** Dark mode by default (`<html className="dark">`). Mobile-first responsive touch layout with virtual keyboard hints (`inputMode="text"`, `enterKeyHint="go"`, `autoCapitalize="none"`).

## Spaced Repetition Score Model:
The glyph score (0–100%) models human memory consolidation (spacing effect and Ebbinghaus forgetting curve):
1. **Daily Anti-Cramming:**
   - Multiple successes on the same calendar day beyond 3 yield diminishing returns:
     $$S_{\text{day}} = \min(3, \text{contiguous successes on that day})$$
   - Daily score contribution is weighted by accuracy:
     $$C_d = \frac{S_{\text{day}}}{3} \times \frac{\text{correct}}{\text{correct} + \text{wrong}}$$
2. **Multi-Day Memory Stability ($S$ in days):**
   - Distinct calendar days with practice ($K$) determine stability:
     - $K = 0 \implies S = 0$
     - $K = 1 \implies S = 1.0$ day
     - $K = 2 \implies S = 3.0$ days
     - $K = 3 \implies S = 7.0$ days
     - $K = 4 \implies S = 14.0$ days
     - $K \ge 5 \implies S = 30.0$ days
   - If the most recent attempt is `'wrong'`, stability drops to $0.5$ days.
3. **Ebbinghaus Forgetting Curve ($R$):**
   - With elapsed days $\Delta t = (\text{now} - \text{last\_timestamp}) / 86400000$:
     $$R = \exp\left(-\frac{\Delta t}{S}\right) \quad (\text{if } S > 0, \text{ else } 0)$$
4. **Acquisition Stage Cap ($\text{Cap}_K$):**
   $$\text{Cap}_K = \begin{cases} 0 & K = 0 \\ 0.40 & K = 1 \\ 0.70 & K = 2 \\ 1.00 & K \ge 3 \end{cases}$$
5. **Final Glyph Score:**
   $$\text{Score} = \text{round}\left(100 \times \text{Cap}_K \times R \times C_{\text{latest}}\right)$$


