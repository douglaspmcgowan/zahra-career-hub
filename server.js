const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = 3456;

// Base directories to scan for markdown files
const SECTIONS = [
  { id: 'updates', label: 'Job Updates', dir: 'updates', icon: '📋', description: 'Latest job listings found for you' },
  { id: 'resources', label: 'Resources', dir: 'resources', icon: '📚', description: 'Immigration, jobs, and support organizations' },
  { id: 'strategy', label: 'Strategy', dir: 'strategy', icon: '🎯', description: 'Search terms and career planning' },
  { id: 'profile', label: 'Your Profile', dir: 'profile', icon: '👤', description: 'Resume and background info' },
];

function getMarkdownFiles(dir) {
  const fullDir = path.join(__dirname, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const filePath = path.join(fullDir, f);
      const stat = fs.statSync(filePath);
      return {
        name: f.replace('.md', '').replace(/-/g, ' '),
        filename: f,
        dir,
        modified: stat.mtime,
        modifiedAgo: timeAgo(stat.mtime),
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function renderMarkdown(content) {
  return marked(content, { breaks: true, gfm: true });
}

// API: list all sections and files
app.get('/api/sections', (req, res) => {
  const sections = SECTIONS.map(s => ({
    ...s,
    files: getMarkdownFiles(s.dir),
  }));
  res.json(sections);
});

// API: get a specific file's content as HTML
app.get('/api/file/:dir/:filename', (req, res) => {
  const { dir, filename } = req.params;
  const allowed = SECTIONS.map(s => s.dir);
  if (!allowed.includes(dir)) return res.status(403).json({ error: 'Not allowed' });

  const filePath = path.join(__dirname, dir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });

  const raw = fs.readFileSync(filePath, 'utf-8');
  const html = renderMarkdown(raw);
  res.json({ html, raw, filename, modified: fs.statSync(filePath).mtime });
});

// Serve the single-page app
app.get('/', (req, res) => {
  res.send(HTML_PAGE);
});

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zahra's Career Hub</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #fafaf9;
      --card: #ffffff;
      --text: #1c1917;
      --text-secondary: #78716c;
      --accent: #2563eb;
      --accent-light: #eff6ff;
      --border: #e7e5e4;
      --hot: #dc2626;
      --summer: #059669;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    header {
      background: white;
      border-bottom: 1px solid var(--border);
      padding: 1.25rem 1.5rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    header h1 {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    header p {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.15rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* Navigation tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 0.25rem;
    }

    .tab {
      padding: 0.6rem 1rem;
      border-radius: 9999px;
      border: 1px solid var(--border);
      background: white;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      white-space: nowrap;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .tab:hover { border-color: var(--accent); color: var(--accent); }
    .tab.active { background: var(--accent); color: white; border-color: var(--accent); }

    .tab-icon { font-size: 1rem; }

    /* Section description */
    .section-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }

    /* File cards */
    .file-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .file-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .file-card:hover {
      border-color: var(--accent);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
    }

    .file-card.active {
      border-color: var(--accent);
      box-shadow: 0 2px 12px rgba(37, 99, 235, 0.12);
    }

    .file-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .file-name {
      font-weight: 600;
      font-size: 0.95rem;
      text-transform: capitalize;
    }

    .file-modified {
      font-size: 0.75rem;
      color: var(--text-secondary);
      background: var(--bg);
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
    }

    /* Content area */
    .content-area {
      margin-top: 1.5rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      display: none;
    }

    .content-area.visible { display: block; }

    .content-back {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: var(--accent);
      cursor: pointer;
      margin-bottom: 1rem;
      font-weight: 500;
    }

    .content-back:hover { text-decoration: underline; }

    /* Markdown content styling */
    .md-content h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 1rem; letter-spacing: -0.02em; }
    .md-content h2 { font-size: 1.15rem; font-weight: 700; margin: 1.75rem 0 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
    .md-content h3 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
    .md-content p { margin-bottom: 0.75rem; font-size: 0.9rem; }
    .md-content ul, .md-content ol { margin: 0.5rem 0 1rem 1.25rem; font-size: 0.9rem; }
    .md-content li { margin-bottom: 0.35rem; }
    .md-content strong { font-weight: 600; }
    .md-content a { color: var(--accent); text-decoration: none; }
    .md-content a:hover { text-decoration: underline; }
    .md-content hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
    .md-content code { background: var(--bg); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.82rem; }
    .md-content pre { background: var(--bg); padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
    .md-content pre code { background: none; padding: 0; }
    .md-content blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; margin: 1rem 0; color: var(--text-secondary); }

    .md-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.85rem;
    }

    .md-content th, .md-content td {
      text-align: left;
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .md-content th {
      font-weight: 600;
      background: var(--bg);
      position: sticky;
      top: 0;
    }

    .md-content tr:hover td { background: var(--accent-light); }

    /* Urgency banner */
    .banner {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }

    .banner strong { color: #92400e; }

    /* Loading */
    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    @media (max-width: 600px) {
      .container { padding: 1rem; }
      .content-area { padding: 1.25rem; }
      .md-content table { font-size: 0.78rem; }
      .md-content th, .md-content td { padding: 0.4rem 0.5rem; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Zahra's Career Hub</h1>
    <p>Job updates, immigration pathways, resources &mdash; all in one place</p>
  </header>

  <div class="container">
    <div class="banner">
      <strong>Timeline:</strong> Certificate ends June 2026. F-1 grace period ~60 days after.
      Contact <strong>UC Berkeley ISSO</strong> this week to check OPT eligibility.
      Best visa option: <strong>E-3</strong> (Australian-exclusive, no lottery).
    </div>

    <div class="tabs" id="tabs"></div>
    <p class="section-desc" id="section-desc"></p>
    <div class="file-list" id="file-list"></div>
    <div class="content-area" id="content-area">
      <div class="content-back" id="back-btn">&larr; Back to files</div>
      <div class="md-content" id="md-content"></div>
    </div>
  </div>

  <script>
    let sections = [];
    let activeSection = 0;

    async function load() {
      const res = await fetch('/api/sections');
      sections = await res.json();
      renderTabs();
      renderFiles();
    }

    function renderTabs() {
      const el = document.getElementById('tabs');
      el.innerHTML = sections.map((s, i) =>
        '<div class="tab ' + (i === activeSection ? 'active' : '') + '" onclick="switchTab(' + i + ')">' +
          '<span class="tab-icon">' + s.icon + '</span>' + s.label +
        '</div>'
      ).join('');
      document.getElementById('section-desc').textContent = sections[activeSection]?.description || '';
    }

    function renderFiles() {
      const s = sections[activeSection];
      const el = document.getElementById('file-list');
      document.getElementById('content-area').classList.remove('visible');
      document.getElementById('file-list').style.display = '';

      if (!s || !s.files.length) {
        el.innerHTML = '<div class="loading">No files yet. Check back after the next job scan!</div>';
        return;
      }

      el.innerHTML = s.files.map(f =>
        '<div class="file-card" onclick="openFile(\\'' + f.dir + '\\', \\'' + f.filename + '\\')">' +
          '<div class="file-card-header">' +
            '<span class="file-name">' + f.name + '</span>' +
            '<span class="file-modified">' + f.modifiedAgo + '</span>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    function switchTab(i) {
      activeSection = i;
      renderTabs();
      renderFiles();
    }

    async function openFile(dir, filename) {
      const res = await fetch('/api/file/' + dir + '/' + filename);
      const data = await res.json();
      document.getElementById('file-list').style.display = 'none';
      document.getElementById('md-content').innerHTML = data.html;
      document.getElementById('content-area').classList.add('visible');

      // Make all links open in new tab
      document.querySelectorAll('.md-content a').forEach(a => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      });
    }

    document.getElementById('back-btn').onclick = renderFiles;

    // Auto-refresh every 5 minutes
    setInterval(load, 5 * 60 * 1000);

    load();
  </script>
</body>
</html>`;

app.listen(PORT, () => {
  console.log('Zahra Career Hub running at http://localhost:' + PORT);
});
