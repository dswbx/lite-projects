# Todos (client-side)

A single-page todo list that runs entirely in the browser. Tasks are stored in **localStorage** (key `lite-todos`), so data stays on your machine and survives refresh. There is no backend.

## Prerequisites

- [Bun](https://bun.sh) (used for install and scripts; Node is not required)

## Start (development)

From this directory:

```bash
bun install
bun dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Production build

```bash
bun run build
```

Output is in `dist/`. Preview locally with `bunx vite preview` if you want to sanity-check the build.

## How to use

- Type a task in the field and click **Add** (or submit the form).
- Use the checkbox to mark a task done or not done.
- Use **All** / **Active** / **Done** to filter the list.
- **Delete** removes one task (shown when you hover a row).
- **Clear completed** removes every finished task at once.

## Stack

Vite 8, React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`).
