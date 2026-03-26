# Zahra Career Hub — Project Guide

## Project Overview
Web app + automated tools helping Zahra Amos (Australian, biology degree, marketing certificate) find a job and stay in the US/Berkeley. Hosted on Vercel at https://zahra-career-hub.vercel.app.

## Tech Stack
- **Server:** Node.js + Express (`server.js`)
- **Markdown rendering:** `marked@9.1.6` (pinned — see Troubleshooting)
- **Hosting:** Vercel (serverless, auto-deploys from GitHub on push)
- **Repo:** https://github.com/douglaspmcgowan/zahra-career-hub

## Key Architecture Decisions
- All content is stored as markdown files in `resources/`, `strategy/`, `profile/`, `updates/`
- The Express app reads markdown at request time and renders to HTML — so updating a .md file and pushing to GitHub automatically updates the live site
- The scheduled job monitor task writes to `updates/latest-jobs.md` and emails zahra.amos124@gmail.com

## Deployment Workflow
1. Edit markdown or server.js locally
2. `git add -A && git commit -m "message" && git push`
3. Vercel auto-redeploys from GitHub (takes ~30 seconds)
4. Verify at https://zahra-career-hub.vercel.app

---

## Troubleshooting — Known Issues & Solutions

### 1. Vercel FUNCTION_INVOCATION_FAILED — `ERR_REQUIRE_ESM`
**Problem:** `marked` latest versions are ESM-only. Vercel's Node.js runtime throws `ERR_REQUIRE_ESM` when you `require()` an ESM package.
**Solution:** Pin `marked` to v9.x which supports CommonJS `require()`. Currently using `marked@9.1.6`.
**Never:** Upgrade marked to v10+ without converting `server.js` to ESM (`import` syntax + `"type": "module"` in package.json).

### 2. Vercel FUNCTION_INVOCATION_FAILED — module.exports
**Problem:** Vercel serverless functions need the Express app exported, not just `app.listen()`.
**Solution:** Always include `module.exports = app;` in server.js. Guard `app.listen()` behind `if (!process.env.VERCEL)`.
```js
module.exports = app;
if (!process.env.VERCEL) {
  app.listen(PORT, () => { ... });
}
```

### 3. Marked v9 renderer API — positional args, not objects
**Problem:** `marked` v9 passes positional arguments to renderer overrides. v12+ uses `{ text, depth }` objects. Using the wrong API causes `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`.
**Solution:** For marked@9.x, use positional args:
```js
// CORRECT for marked v9:
renderer.heading = function(text, level) { ... }
renderer.table = function(header, body) { ... }

// WRONG for marked v9 (this is v12+ syntax):
renderer.heading = function({ text, depth }) { ... }
```

### 4. Inline onclick handlers break on mobile
**Problem:** Template-generated `onclick="openFile('dir', 'file')"` with escaped quotes breaks in some mobile browsers and when the string contains special characters.
**Solution:** Use `data-` attributes and attach event listeners via JS:
```js
// Template:
'<div class="file-card" data-dir="' + f.dir + '" data-file="' + f.filename + '">'

// Event binding:
el.querySelectorAll('.file-card').forEach(function(card) {
  card.addEventListener('click', function() {
    openFile(card.dataset.dir, card.dataset.file);
  });
});
```

### 5. Anchor links scroll behind sticky header
**Problem:** `scrollIntoView({ block: 'start' })` puts the target element at the very top of the viewport, behind the sticky header.
**Solution:** Use CSS `scroll-margin-top` on heading elements:
```css
.md-content h1, .md-content h2, .md-content h3, .md-content h4 {
  scroll-margin-top: 7rem;
}
```

### 6. Tables overflow on mobile
**Problem:** Wide tables break the layout on small screens.
**Solution:** Wrap tables in a scrollable container using a custom marked renderer:
```js
renderer.table = function(header, body) {
  return '<div class="table-wrap"><table><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>';
};
```
```css
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.md-content table { min-width: 500px; }
```

### 7. Python job scraper — RSS feeds blocked (403)
**Problem:** Indeed and BioSpace block direct RSS/API requests with 403 Forbidden.
**Solution:** Don't use direct RSS fetches to these sites. Instead:
- Use job board APIs that allow programmatic access (Lever, Greenhouse career page APIs from target companies)
- Or use the Claude scheduled task for web-search-based discovery
- The Python scraper framework is in `tools/job_scraper.py` — swap in working sources

### 8. Vercel project name error
**Problem:** `vercel --yes --prod` fails with "Project names must be lowercase" if the directory name has spaces or uppercase.
**Solution:** Use `--name` flag: `npx vercel --yes --prod --name zahra-career-hub`

---

## Scheduled Tasks
- **zahra-job-scan:** Runs Mon + Thu at 9 AM. Searches web for jobs, writes to `updates/latest-jobs.md`, emails zahra.amos124@gmail.com. Edit search terms in `strategy/job-search-queries.md`.

## File Structure
```
Zahra/
├── server.js              # Express app (serves markdown as HTML)
├── vercel.json            # Vercel deployment config
├── package.json           # Node dependencies (express, marked@9.1.6)
├── profile/               # Zahra's resume and background
├── resources/             # Immigration, jobs, support org research
├── strategy/              # Search terms, open roles, career planning
├── updates/               # Auto-generated job scan results
└── tools/                 # Python scraper (needs working sources)
```
