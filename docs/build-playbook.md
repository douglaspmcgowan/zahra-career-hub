# Build Playbook: Content Hub Web App

How this app was built from scratch in one session, what went wrong, what went right, and how to do it faster next time.

---

## What We Built

A live web app that serves markdown files as a clean, mobile-friendly website with:
- Tabbed navigation with custom ordering
- Search across all content
- Dark mode (persisted in localStorage)
- Anchor link scrolling with sticky header offset
- Scroll-to-top button
- Auto-deploys from GitHub via Vercel
- Scheduled task that updates content and emails the user

**Stack:** Node.js + Express + marked (markdown renderer) → Vercel serverless
**Time:** ~2 hours from zero to deployed with all features

---

## Architecture

```
GitHub Repo (auto-deploys to Vercel on push)
│
├── server.js              ← Single file: Express app + all HTML/CSS/JS inline
├── vercel.json            ← Routes all requests to server.js
├── package.json           ← express + marked@9.1.6
│
├── [content-dir-1]/       ← Markdown files (one dir per tab)
│   ├── file-a.md
│   └── file-b.md
├── [content-dir-2]/
│   └── file-c.md
└── .claude/
    └── launch.json        ← Local dev server config for preview
```

### Key Design Decisions

1. **Single-file app.** All HTML, CSS, and JS live inside `server.js` as a template literal. No build step, no bundler, no framework. This makes it trivial to deploy and debug.

2. **Markdown as the content layer.** All content is `.md` files in directories. The app reads and renders them at request time. To update content, just edit a markdown file and push. No CMS, no database.

3. **Directories = tabs.** Each directory maps to a tab in the UI. The `SECTIONS` array in server.js defines the order, labels, and icons.

4. **FILE_CONFIG for metadata.** Display names, sort priority, and dates are stored in a JS object in server.js — not derived from the filesystem (which is unreliable on serverless).

5. **Vercel serverless.** Express app exported via `module.exports = app`. Vercel runs it as a serverless function. Zero infrastructure to manage.

---

## Process: How to Build This Again

### Phase 1: Content First (~30 min)

1. Create the project directory
2. Research/generate all the markdown content using parallel agents
3. Organize into directories (one per tab)
4. Don't touch code yet — get the content right first

### Phase 2: Scaffold the App (~15 min)

1. `npm init -y && npm install express marked@9.1.6`
2. Create `server.js` with this skeleton:
   - Express app with two API routes: `/api/sections` (list files) and `/api/file/:dir/:filename` (render markdown)
   - A `SECTIONS` array defining tabs
   - A `FILE_CONFIG` object for display names, priority, dates
   - The full HTML page as a template literal with inline CSS and JS
   - `module.exports = app` for Vercel + guarded `app.listen()` for local dev
3. Create `.claude/launch.json` for local preview
4. Test locally with `preview_start`

### Phase 3: Style & UX (~20 min)

1. CSS variables for light theme
2. Dark mode CSS variables on `[data-theme="dark"]`
3. Mobile responsive (`@media max-width: 600px`)
4. Search bar with preloaded file content
5. Scroll-to-top button
6. Page transitions (CSS `@keyframes fadeIn`)

### Phase 4: Deploy (~5 min)

1. `git init && git add -A && git commit`
2. `gh repo create [name] --public --source=. --push`
3. Create `vercel.json`
4. `npx vercel login` then `npx vercel --yes --prod --name [name]`
5. Vercel auto-connects to GitHub — every push redeploys

### Phase 5: Iterate (~ongoing)

1. Test on preview, screenshot, fix
2. Push to GitHub → Vercel auto-deploys
3. Check live site

---

## Pitfalls & Solutions (In Order of Occurrence)

### 1. `marked` ESM vs CommonJS
**What happened:** Installed latest `marked` (v12+), which is ESM-only. Used `require()` in server.js. Worked locally (Node v24 is lenient), crashed on Vercel with `ERR_REQUIRE_ESM`.
**Fix:** Pin `marked@9.1.6` which supports CommonJS.
**Next time:** Always pin `marked@9.1.6` or convert server.js to ESM if you want latest.

### 2. `module.exports` missing for Vercel
**What happened:** App only called `app.listen()` — Vercel needs the app exported.
**Fix:** Add `module.exports = app` and guard `app.listen()` behind `if (!process.env.VERCEL)`.
**Next time:** Always include both from the start. This is boilerplate.

### 3. `marked` v9 renderer API is positional, not object-based
**What happened:** Used `renderer.heading = function({ text, depth })` (v12+ syntax). Marked v9 passes positional args: `function(text, level)`. Caused `TypeError: Cannot read properties of undefined`.
**Fix:** Use positional args: `renderer.heading = function(text, level) { ... }`.
**Next time:** If using marked@9, always use positional args for renderer overrides.

### 4. Inline `onclick` handlers break on mobile
**What happened:** Template-generated `onclick="openFile('dir', 'file')"` with escaped quotes didn't fire on mobile.
**Fix:** Use `data-` attributes and `addEventListener` instead of inline handlers.
**Next time:** Never use inline onclick in dynamically generated HTML. Always use event delegation.

### 5. Anchor links scroll behind sticky header
**What happened:** `scrollIntoView({ block: 'start' })` puts the target at the very top, hidden behind the sticky header.
**Fix:** CSS `scroll-margin-top: 7rem` on all heading elements.
**Next time:** Always add `scroll-margin-top` when you have a sticky header. Do this in the initial CSS.

### 6. Tables overflow on mobile
**What happened:** Wide markdown tables broke the mobile layout.
**Fix:** Custom `renderer.table` wrapping output in `<div class="table-wrap">` with `overflow-x: auto`.
**Next time:** Always wrap tables in a scrollable container from the start.

### 7. File dates wrong on Vercel (shows ancient dates)
**What happened:** `fs.statSync(filePath).mtime` returns build time or epoch on Vercel's serverless filesystem, not the actual last-modified date.
**Fix:** Store dates as strings in `FILE_CONFIG` and update them manually when pushing changes.
**Next time:** Never trust filesystem dates on serverless platforms. Use hardcoded dates or git commit dates.

### 8. Anchor link `--` vs `-` mismatch
**What happened:** Headings with `&` (like "Research & J-1 Programs") produce `--` in markdown TOC links but `-` in the slugify function output.
**Fix:** Fallback matching in the click handler: `document.getElementById(id) || document.getElementById(id.replace(/--/g, '-'))`.
**Next time:** Add this fallback to the anchor click handler from the start.

### 9. Regex in template literal
**What happened:** A regex for search highlighting (`/[.*+?^${}()|[\]\\]/g`) contained characters that broke the JS inside the template literal.
**Fix:** Simplified the regex and wrapped in try/catch.
**Next time:** Keep regex simple inside template literals. Use try/catch around regex operations with user input.

### 10. Vercel project name with spaces
**What happened:** Directory name had spaces ("Other People's Code"), Vercel rejected the auto-generated project name.
**Fix:** Use `--name` flag: `npx vercel --yes --prod --name clean-name`.
**Next time:** Always pass `--name` with a clean kebab-case name.

---

## Feature Checklist for Next Build

Copy this and check off as you go:

### Core
- [ ] Express + marked@9.1.6 + module.exports
- [ ] SECTIONS array (tab order, labels, icons, descriptions)
- [ ] FILE_CONFIG (display names, priority, hardcoded dates)
- [ ] `/api/sections` and `/api/file/:dir/:filename` routes
- [ ] vercel.json with routes to server.js
- [ ] .claude/launch.json for local preview

### UI
- [ ] CSS variables for theming
- [ ] Dark mode toggle (localStorage persistence)
- [ ] Mobile responsive (600px breakpoint)
- [ ] Sticky header
- [ ] Tabs with horizontal scroll on mobile
- [ ] File cards with data-attributes (not inline onclick)
- [ ] Content area with back button
- [ ] Scroll-to-top button (shows after 400px)
- [ ] Page transitions (fadeIn animation)
- [ ] Google Fonts (Inter)
- [ ] Favicon (emoji SVG data URI)

### Markdown Rendering
- [ ] Custom heading renderer with slugify + IDs
- [ ] scroll-margin-top on headings (7rem)
- [ ] Anchor click handler with `--` to `-` fallback
- [ ] Table wrapper with overflow-x: auto
- [ ] External links open in new tab
- [ ] Anchor links scroll smoothly in-page

### Search
- [ ] Preload all file content on page load
- [ ] Debounced input handler (200ms)
- [ ] Keyword highlighting with <mark>
- [ ] Click result to open file
- [ ] Hide main content during search, restore on clear

### Deploy
- [ ] git init + GitHub repo via `gh repo create`
- [ ] vercel.json
- [ ] `npx vercel login` + `npx vercel --yes --prod --name [name]`
- [ ] Verify with `curl -s -o /dev/null -w "%{http_code}" [url]`
- [ ] Check Vercel logs if 500: `npx vercel logs [url]`

---

## Automation Opportunities

Things that could be scripted or templated for next time:

1. **Scaffold script** — Generate the entire server.js from a config file that specifies tabs, colors, title, and content directories.

2. **Auto-date update** — A git pre-commit hook that reads changed .md files and updates their dates in FILE_CONFIG automatically.

3. **Content pipeline** — Claude scheduled tasks that write markdown → git commit → git push → Vercel auto-deploys. The full loop is already set up for job scanning.

4. **Template repo** — Turn this into a GitHub template repo. `gh repo create --template` and you have a new content hub in 30 seconds.

5. **CSS theme generator** — Define light/dark colors in one place and auto-generate both themes.

---

## Files Reference

| File | Purpose |
|------|---------|
| `server.js` | The entire app — Express server, HTML, CSS, JS, API routes |
| `vercel.json` | Tells Vercel to route everything to server.js |
| `package.json` | Dependencies: express, marked@9.1.6 |
| `.claude/launch.json` | Local dev server config |
| `CLAUDE.md` | Project guide + troubleshooting for Claude |
| `[dirs]/*.md` | Content files — one directory per tab |
