const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = 3456;

// Base directories to scan for markdown files — Strategy first per user request
const SECTIONS = [
  { id: 'strategy', label: 'Strategy', dir: 'strategy', icon: '🎯', description: 'Open roles, search terms, and career planning' },
  { id: 'resources', label: 'Resources', dir: 'resources', icon: '📚', description: 'Immigration, jobs, and support organizations' },
  { id: 'updates', label: 'Job Updates', dir: 'updates', icon: '📋', description: 'Latest job listings found for you' },
  { id: 'profile', label: 'Your Profile', dir: 'profile', icon: '👤', description: 'Resume and background info' },
];

// Custom display names and sort priority (lower = first)
const FILE_CONFIG = {
  'open-roles.md': { displayName: 'Open Roles — Apply Now', priority: 0 },
  'resume-linkedin-guide.md': { displayName: 'Resume & LinkedIn Guide', priority: 0 },
  'all-pathways-comprehensive.md': { displayName: 'All Pathways (Full Guide)', priority: 0 },
  'bay-area-jobs.md': { displayName: 'Bay Area Jobs & Target Companies', priority: 1 },
  'immigration-pathways.md': { displayName: 'Immigration Pathways', priority: 2 },
  'international-resources.md': { displayName: 'International Resources', priority: 3 },
  'job-search-queries.md': { displayName: 'Job Search Queries', priority: 5 },
  'latest-jobs.md': { displayName: 'Latest Job Scan', priority: 0 },
  'zahra-profile.md': { displayName: 'Your Profile', priority: 0 },
};

function getMarkdownFiles(dir) {
  const fullDir = path.join(__dirname, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const filePath = path.join(fullDir, f);
      const config = FILE_CONFIG[f] || {};
      const defaultName = f.replace('.md', '').replace(/-/g, ' ');
      return {
        name: config.displayName || defaultName,
        filename: f,
        dir,
        priority: config.priority !== undefined ? config.priority : 10,
        modifiedAgo: formatDate(fs.statSync(filePath).mtime),
      };
    })
    .sort((a, b) => a.priority - b.priority);
}

function formatDate(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffDays = Math.floor(diffMs / 86400000);

  // If modified within last hour, show relative time
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // On Vercel, file mtime is unreliable (can show ancient dates).
  // If the date is more than 30 days old, it's definitely wrong — show "Mar 2026"
  if (diffDays > 30) return 'Mar 2026';

  // Otherwise show month + day
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[date.getMonth()] + ' ' + date.getDate();
}

// Keep timeAgo for backwards compat but unused now
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

function slugify(text) {
  return text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
}

function renderMarkdown(content) {
  const renderer = new marked.Renderer();
  // marked v9: heading(text, level, raw)
  renderer.heading = function(text, level) {
    const slug = slugify(text);
    return `<h${level} id="${slug}">${text}</h${level}>`;
  };
  // marked v9: table(header, body)
  renderer.table = function(header, body) {
    return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
  };
  return marked(content, { breaks: true, gfm: true, renderer });
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
    .md-content h1, .md-content h2, .md-content h3, .md-content h4 { scroll-margin-top: 7rem; }
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

    /* Next steps dropdown */
    .next-steps {
      background: white;
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }

    .next-steps summary {
      padding: 0.9rem 1.25rem;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.95rem;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      user-select: none;
    }

    .next-steps summary::-webkit-details-marker { display: none; }

    .next-steps summary::before {
      content: '\\25B6';
      font-size: 0.7rem;
      transition: transform 0.2s;
      color: var(--accent);
    }

    .next-steps[open] summary::before { transform: rotate(90deg); }

    .next-steps-content {
      padding: 0 1.25rem 1rem;
    }

    .step-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid var(--bg);
      font-size: 0.85rem;
      align-items: flex-start;
    }

    .step-item:last-child { border-bottom: none; }

    .step-urgency {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      white-space: nowrap;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .urgency-now {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .urgency-soon {
      background: #fff7ed;
      color: #ea580c;
      border: 1px solid #fed7aa;
    }

    .urgency-ongoing {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    .step-text strong { font-weight: 600; }
    .step-detail { color: var(--text-secondary); }

    /* Loading */
    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Tables: always scrollable on all screens */
    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 1rem 0;
    }

    .md-content table { min-width: 500px; }

    @media (max-width: 600px) {
      .container { padding: 0.75rem; }
      .content-area { padding: 1rem; }
      .md-content table { font-size: 0.78rem; }
      .md-content th, .md-content td { padding: 0.4rem 0.5rem; }

      header { padding: 1rem; }
      header h1 { font-size: 1.1rem; }

      .banner { font-size: 0.8rem; padding: 0.75rem 1rem; }

      .next-steps summary { font-size: 0.9rem; padding: 0.75rem 1rem; }
      .step-item { font-size: 0.82rem; }
      .step-urgency { font-size: 0.65rem; }

      .file-card { padding: 0.85rem 1rem; }
      .file-name { font-size: 0.9rem; }

      .tab { padding: 0.5rem 0.85rem; font-size: 0.8rem; }
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

    <details class="next-steps" open>
      <summary>Immediate Next Steps</summary>
      <div class="next-steps-content">
        <div class="step-item">
          <span class="step-urgency urgency-now">THIS WEEK</span>
          <div class="step-text"><strong>Contact UC Berkeley ISSO</strong> &mdash; Ask if your marketing certificate qualifies for OPT. This determines your entire timeline. <span class="step-detail">Visit internationaloffice.berkeley.edu or walk in.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-now">THIS WEEK</span>
          <div class="step-text"><strong>Apply to summer camps</strong> &mdash; Galileo Camps, iD Tech, and Lawrence Hall of Science are hiring now for summer 2026. <span class="step-detail">These are immediate income + keeps you in Berkeley.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-soon">NEXT 2 WKS</span>
          <div class="step-text"><strong>Talk to your coaches</strong> &mdash; Ask about graduate assistant coaching positions at Cal. Combines grad school (extends F-1) with paid coaching. <span class="step-detail">Your coaches can connect you to the right people.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-soon">NEXT 2 WKS</span>
          <div class="step-text"><strong>Apply to Lawrence Hall of Science</strong> &mdash; Science education roles + summer camp positions right on Berkeley campus. <span class="step-detail">Best fit for biology + teaching + people skills.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-soon">NEXT 2 WKS</span>
          <div class="step-text"><strong>Look into USF Sport Management MA</strong> &mdash; Rolling admissions for Fall 2026. Combines D1 athletics + marketing. Maintains F-1. <span class="step-detail">30 min from Berkeley. Backup plan if jobs take time.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-soon">NEXT 2 WKS</span>
          <div class="step-text"><strong>Reach out to FCA (Fellowship of Christian Athletes)</strong> &mdash; D1 athlete + Christian faith = perfect fit. They hire campus staff and may sponsor R-1 visa. <span class="step-detail">fcaaustin.org or search FCA Bay Area.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-ongoing">ONGOING</span>
          <div class="step-text"><strong>Set up LinkedIn job alerts</strong> &mdash; "biotech marketing Bay Area", "science education Berkeley", "marketing coordinator biotech". <span class="step-detail">Check the Resources tab for full list of job boards.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-ongoing">ONGOING</span>
          <div class="step-text"><strong>When applying: lead with E-3 visa</strong> &mdash; Tell employers you're Australian and eligible for the E-3 visa. It's faster, cheaper, and easier than H-1B with no lottery. <span class="step-detail">Most employers don't know about it &mdash; educate them.</span></div>
        </div>
      </div>
    </details>

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
        '<div class="file-card" data-dir="' + f.dir + '" data-file="' + f.filename + '">' +
          '<div class="file-card-header">' +
            '<span class="file-name">' + f.name + '</span>' +
            '<span class="file-modified">' + f.modifiedAgo + '</span>' +
          '</div>' +
        '</div>'
      ).join('');

      // Attach click handlers via event delegation (works on mobile)
      el.querySelectorAll('.file-card').forEach(function(card) {
        card.addEventListener('click', function() {
          openFile(card.dataset.dir, card.dataset.file);
        });
      });
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

      // Handle links: anchor links scroll in-page, external links open in new tab
      document.querySelectorAll('.md-content a').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('#')) {
          // Anchor link — scroll to the element
          a.removeAttribute('target');
          a.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = href.slice(1);
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        } else {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener');
        }
      });

      // Scroll so the tabs + content title are visible (not hidden behind sticky header)
      document.getElementById('tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.getElementById('back-btn').onclick = renderFiles;

    // Auto-refresh every 5 minutes
    setInterval(load, 5 * 60 * 1000);

    load();
  </script>
</body>
</html>`;

// Export for Vercel serverless. Also listen locally for dev.
module.exports = app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('Zahra Career Hub running at http://localhost:' + PORT);
  });
}
