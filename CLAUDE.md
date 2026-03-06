# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # dev server (Vite, default http://localhost:5173)
npm run build     # type-check (vue-tsc) + production build
npm run preview   # preview production build
```

No test runner is configured. Type-checking is done via `vue-tsc` as part of `npm run build`.

## Stack

Vue 3 + TypeScript + Vite + Tailwind CSS v4 + Pinia + Vue Router v5 + TanStack Vue Table v8 + Axios + lucide-vue-next

## Architecture

### API layer (`src/api/`)

- `src/api/index.ts` — shared Axios instance. Base URL: `VITE_API_BASE_URL` env var (falls back to `http://localhost:8080`). Attaches `Authorization: Bearer <token>` from Pinia auth store on every request. Redirects to `/login` on 401/403.
- One file per domain (e.g. `quote.ts`, `order.ts`). Import and use the shared instance from `index.ts`.

### State (`src/stores/auth.ts`)

Single Pinia store for auth. Holds JWT token and username. `logout()` clears state.

### Routing (`src/router/index.ts`)

Navigation guard: redirects unauthenticated users to `/login`. When adding a new route, also add it to `src/config/menus.ts` for the sidebar.

### CRUD page pattern

Most list pages use the same three-layer pattern:

1. **`useCrudPage<TDto, TReq>()`** (`src/composables/useCrudPage.ts`) — wires up `rows`, `loading`, `submitting`, `modalOpen`, `modalError`, `editTarget`, `deleteTarget`, and all handlers (`fetchData`, `openCreate`, `openEdit`, `handleSave`, `confirmDelete`, `handleDelete`). `TDto` must extend `{ id: number; name: string }`.

2. **`<DataTable>`** (`src/components/DataTable.vue`) — wraps TanStack Vue Table. Props: `data`, `columns` (TanStack `ColumnDef[]`), `loading?`, `tableId?`. Pass `tableId` to enable per-user column visibility/order persistence in `localStorage` (key: `col-settings:<username>:<tableId>`). Exposes an `#actions` slot with `{ row }`.

3. **`<CrudModal>`** (`src/components/CrudModal.vue`) — generic `v-model` modal driven by a `fields: FieldDef[]` prop. Emits `confirm` with `Record<string, string>`. Use for simple flat forms. For complex forms (line items, multi-section layouts), create a dedicated modal component like `QuoteFormModal.vue`.

### Search pattern

`<SearchBar>` (`src/components/SearchBar.vue`) accepts `modelValue: Record<string, string>` and `fields: SearchFieldDef[]`. Field types: `text` (default), `select`, `date`. Emits `search` and `reset`. For screens with basic + advanced search, render two `<SearchBar>` instances with a toggle, sharing the same `reactive` search object.

### Adding a new domain screen

1. Create `src/api/<domain>.ts` using the shared axios instance from `src/api/index.ts`.
2. Add a route in `src/router/index.ts`.
3. Add a menu entry in `src/config/menus.ts`.
4. Build the view with `useCrudPage` + `<DataTable>` + `<CrudModal>` (or a custom modal).
5. Call `useScreenInit().initialize()` in `onMounted` if the screen needs the current user context.

### Implemented screens
`/login`, `/` (dashboard), `/partner`, `/item`, `/process`, `/employee`, `/common-code`, `/quote`, `/order`

### Stub screens (not yet implemented)
`/price`, `/shipment`, `/revenue`, `/order-fulfillment`

## Key composables

| Composable | Purpose |
|---|---|
| `useCrudPage` | Full CRUD state + handler wiring |
| `useColumnSettings` | localStorage persistence for DataTable column visibility/order, keyed by username + tableId |
| `useScreenInit` | Fetches current user via GraphQL `{ me { username role } }` |
