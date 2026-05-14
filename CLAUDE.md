# CLAUDE.md — MechIQ Project Rules

> **READ THIS FIRST before touching any file.**
> This file exists because Claude kept breaking working features by over-rewriting things.
> Every rule here was learned the hard way. Do not skip any of them.

---

## Project Stack

| Layer | Tech |
|-------|------|
| Frontend | React CRA (Create React App) |
| Backend | Supabase (Postgres + Auth) |
| Deploy | Vercel (auto-deploy on push to `main`) |
| Workers | Cloudflare Workers |
| AI service | Python on Railway |
| Repo | `mickfazl-ai/MechIQ` — branch `main` |
| Local source | `C:\Users\mickf\Documents\mechiq\src\` |

---

## Design System — LOCKED

### Colours
- **Blue `#1976D2`** — UI chrome only: buttons, active nav, links, focus rings, logo mark
- **Green `#15803D`** — status OK / operational / passing
- **Amber `#B45309`** — warning / due soon / caution  
- **Red `#B91C1C`** — fault / overdue / critical
- **Background `#F0F2F5`** — page background
- **Surface `#FFFFFF`** — cards, panels, sidebar, topbar
- **Border `#E5E7EB`** — default borders
- **Text `#111827`** — primary text
- **Text muted `#6B7280`** — secondary text

**NO OTHER COLOURS.** No cyan `#00c2e0`, no teal, no purple, no rainbow. No dark backgrounds anywhere.

### Typography
- **Font**: Inter (body), JetBrains Mono (numbers, monospace data)
- No Barlow Condensed, no Space Grotesk, no Outfit

### Edges
- **Sharp**. `border-radius` max 3–4px. No rounded pills on containers.
- `--radius-sm: 0px`, `--radius: 2px`, `--radius-lg: 3px`

### NO dark themes
- Sidebar: white `#FFFFFF`
- Topbar: white `#FFFFFF`
- Background: light grey `#F0F2F5`
- No `#111827` or darker backgrounds on any visible surface

---

## Sidebar / Navigation — DO NOT REWRITE

### Behaviour (locked — do not change)
1. **Always collapsed** — 60px icon rail. Never auto-expands.
2. **Hover** → tooltip appears to the right showing the page name
3. **Click** (item with sub-pages) → flyout panel appears with sub-items
4. **Click** (item without sub-pages) → navigates to that page
5. **No expand/collapse toggle** — there is no button to expand the sidebar to full width
6. The `expanded` state must always be `false`. Do not add a toggle.

### How navigation works
- `setCurrentPage(page, subPage)` is passed from `App.js` as a prop to `<Navbar>`
- Inside Navbar: `handleNav(id, subPage)` calls `setCurrentPage(id, subPage)` then closes flyouts
- `SidebarItem` calls `onNav(item.id, null)` which is `handleNav`
- **DO NOT replace `SidebarItem` with a different component** — this is what broke it twice

### What App.js passes to Navbar
```jsx
<Navbar
  currentPage={currentPage}
  setCurrentPage={setCurrentPage}
  onLogout={handleLogout}
  session={session}
  userRole={userRole}
  viewingCompany={viewingCompany}
  onSelectCompany={handleSelectCompany}
  onExitCompany={handleExitCompany}
  isDemo={isDemo}
/>
```
Note: `currentSubPage` is NOT passed by App.js. Default it to `null` in Navbar.

### Navbar.js rule
**Only patch the `CSS` constant.** Never rewrite the JS component logic, `SidebarItem`, `handleNav`, `updateLayout`, or the main `Navbar` function structure.

---

## Dashboard — DO NOT REWRITE

### What must be preserved
- `onDragStart` / `onDrop` / `onDragOver` — widget drag/drop reorder in CustomisePanel
- `WidgetBuilderModal` import from `./CustomWidget`
- Recharts imports: `BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell`
- All Supabase queries in `load()`: assets, downtime, maintenance, work_orders
- `getLayout` / `saveLayout` with localStorage persistence
- `drillDown` modal (bottom sheet)
- `WidgetPrestartKPI`, `WidgetServiceKPI` and all other Widget* components
- `useToast` hook

### Dashboard rule
**Only patch the `CSS` constant and the main render layout.** Never remove imports or widget component functions.

---

## CustomWidget.js — Design rules
- **No emoji icons** anywhere in the widget builder
- Colour picker: only 4 options — Blue `#1976D2`, Green `#15803D`, Amber `#B45309`, Red `#B91C1C`
- Size buttons: sharp edges (`borderRadius: 0`)
- Default `color: '#1976D2'`, default `icon: ''`

---

## General Rules — Read Every Time

### The golden rule
> **Patch, don't rewrite.** If a file works, change only what is asked. Never do a full rewrite unless explicitly agreed.

### Specific prohibitions
1. **Never remove recharts import from Dashboard.js**
2. **Never replace `SidebarItem` with a different component** — it breaks navigation
3. **Never change `expanded` default to `true`** — sidebar must always be collapsed
4. **Never add dark backgrounds** (`#111827`, `#0d1117`, `#09111f`, `#1D3650`, etc.) to any surface
5. **Never use cyan** `#00c2e0` or `#00ABE4` or `#0ea5e9` anywhere — blue is `#1976D2`
6. **Never add emoji icons** to any UI element
7. **Never change the auth logic** in Login.js (`signInWithPassword`, `persistSessionForDevice`, `clearPersistedSession`, `getSession`)
8. **Never move files to project root** — all source files go in `src/`
9. **Never do multiple full file rewrites in one session** — do one at a time, verify it works

### Before touching any file
1. Read this CLAUDE.md
2. Read the target file — understand what it does
3. Make the smallest possible change
4. Verify the change doesn't remove imports, break props, or remove handlers

### When asked to change the design
- Change the `CSS` constant only
- Do NOT restructure the component JSX
- Do NOT rename state variables
- Do NOT change function signatures

### Deploy snippet (always end with this)
```bash
cd C:\Users\mickf\Documents\mechiq
git add src/
git commit -m "description of change"
git push origin main
```

---

## Key File Reference

| File | Purpose | Danger zone |
|------|---------|-------------|
| `App.js` | Router, auth, layout | Don't change page routing or Navbar props |
| `App.css` | Design tokens (CSS vars) | Only update colour/spacing vars |
| `Navbar.js` | Sidebar + topbar | Only patch CSS const. Never touch JS logic |
| `Dashboard.js` | Dashboard widgets | Only patch CSS const + render layout |
| `Login.js` | Auth UI | Never touch auth function calls |
| `CustomWidget.js` | Widget builder | Remove emojis, 4-colour palette only |
| `MachineProfile.js` | Asset detail page | Print styles are intentionally dark — leave them |
| `Settings.js` | App settings | Theme preview swatches — leave colours alone |

---

## What Mick Wants (summary from feedback)

- **Light, white, clean** — modern SaaS like Stripe/Linear/Vercel. Not industrial, not dark.
- **Blue everywhere** for UI, green/amber/red for status only
- **Sharp edges** — not rounded cards
- **Icon-only sidebar** with hover tooltips — never expanded by default
- **No emoji** anywhere in the UI
- **Working navigation first** — visual improvements second
- **Patch files, don't rewrite them** — stability over aesthetics

---

*Last updated: May 2026. Update this file when new decisions are made.*
