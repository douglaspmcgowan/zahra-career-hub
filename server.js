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

// Custom display names, sort priority, and last-updated dates.
// UPDATE the date here whenever you edit a file and push.
const FILE_CONFIG = {
  'open-roles.md': { displayName: 'Open Roles — Apply Now', priority: 0, date: 'Mar 25, 2026' },
  'resume-linkedin-guide.md': { displayName: 'Resume & LinkedIn Guide', priority: 0, date: 'Mar 25, 2026' },
  'all-pathways-comprehensive.md': { displayName: 'All Pathways (Full Guide)', priority: 0, date: 'Mar 25, 2026' },
  'bay-area-jobs.md': { displayName: 'Bay Area Jobs & Target Companies', priority: 1, date: 'Mar 25, 2026' },
  'immigration-pathways.md': { displayName: 'Immigration Pathways', priority: 2, date: 'Mar 25, 2026' },
  'international-resources.md': { displayName: 'International Resources', priority: 3, date: 'Mar 25, 2026' },
  'job-search-queries.md': { displayName: 'Job Search Queries', priority: 5, date: 'Mar 25, 2026' },
  'latest-jobs.md': { displayName: 'Latest Job Scan', priority: 0, date: 'Mar 25, 2026' },
  'zahra-profile.md': { displayName: 'Your Profile', priority: 0, date: 'Mar 25, 2026' },
  'history.md': { displayName: 'Scan History', priority: 10, date: 'Mar 25, 2026' },
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
        modifiedAgo: config.date || 'Mar 2026',
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
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')    // strip HTML tags
    .replace(/&amp;/g, '')      // strip &amp; (marked encodes & as &amp;)
    .replace(/&/g, '')          // strip raw &
    .replace(/[^\w\s-]/g, '')   // strip other special chars
    .replace(/\s+/g, '-')       // spaces to dashes
    .replace(/-{2,}/g, '--')    // preserve double dashes (TOC convention)
    .trim();
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
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎯</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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

    [data-theme="dark"] {
      --bg: #1a1a1a;
      --card: #262626;
      --text: #e5e5e5;
      --text-secondary: #a3a3a3;
      --accent: #60a5fa;
      --accent-light: #1e3a5f;
      --border: #404040;
      --hot: #f87171;
      --summer: #34d399;
    }

    [data-theme="dark"] header { background: #1f1f1f; }
    [data-theme="dark"] .banner { background: linear-gradient(135deg, #422006, #451a03); border-color: #92400e; }
    [data-theme="dark"] .banner strong { color: #fbbf24; }
    [data-theme="dark"] .next-steps { background: var(--card); }
    [data-theme="dark"] .urgency-now { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
    [data-theme="dark"] .urgency-soon { background: #431407; color: #fdba74; border-color: #7c2d12; }
    [data-theme="dark"] .urgency-ongoing { background: #172554; color: #93c5fd; border-color: #1e3a5f; }
    [data-theme="dark"] .md-content th { background: #333; }
    [data-theme="dark"] .md-content tr:hover td { background: #333; }
    [data-theme="dark"] .file-modified { background: #333; }
    [data-theme="dark"] .tab { background: var(--card); color: var(--text); border-color: var(--border); }
    [data-theme="dark"] .tab:hover { border-color: var(--accent); color: var(--accent); }
    [data-theme="dark"] .tab.active { background: var(--accent); color: white; border-color: var(--accent); }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      transition: background 0.3s, color 0.3s;
    }

    /* Page transitions */
    .fade-in { animation: fadeIn 0.25s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* Search bar */
    .search-wrap {
      position: relative;
      margin-bottom: 1rem;
    }

    .search-input {
      width: 100%;
      padding: 0.7rem 1rem 0.7rem 2.5rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--card);
      color: var(--text);
      font-family: inherit;
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-size: 0.85rem;
      pointer-events: none;
    }

    .search-results {
      margin-top: 0.75rem;
    }

    .search-result-item {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .search-result-item:hover {
      border-color: var(--accent);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
    }

    .search-result-title { font-weight: 600; font-size: 0.85rem; }
    .search-result-context { font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; }
    .search-result-context mark { background: #fef08a; color: #1c1917; border-radius: 2px; padding: 0 2px; }
    [data-theme="dark"] .search-result-context mark { background: #854d0e; color: #fef08a; }

    header {
      background: white;
      border-bottom: 1px solid var(--border);
      padding: 1.25rem 1.5rem;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dark-toggle {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 9999px;
      width: 2.5rem;
      height: 2.5rem;
      cursor: pointer;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .dark-toggle:hover { border-color: var(--accent); }

    .scroll-top {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.2);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s, transform 0.25s;
      transform: translateY(10px);
      z-index: 200;
    }

    .scroll-top.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    .scroll-top:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }

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
      transition: all 0.2s;
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
    <div>
      <h1>Zahra's Career Hub</h1>
      <p>Job updates, immigration pathways, resources &mdash; all in one place</p>
    </div>
    <button class="dark-toggle" onclick="toggleDark()" title="Toggle dark mode">&#9790;</button>
  </header>

  <div class="container">
    <div class="banner">
      <strong>Timeline:</strong> Certificate ends June 2026. F-1 grace period ~60 days after.
      Contact <strong>UC Berkeley ISSO</strong> this week to check OPT eligibility.
      Best visa option: <strong>E-3</strong> (Australian-exclusive, no lottery).
    </div>

    <details class="next-steps">
      <summary>Why E-3 Visa is Your Best Option</summary>
      <div class="next-steps-content" style="font-size: 0.85rem;">
        <p>The <strong>E-3 visa</strong> is exclusively for Australians and is basically a cheat code:</p>
        <div class="step-item">
          <span class="step-urgency urgency-now" style="font-size:0.6rem;">KEY</span>
          <div class="step-text"><strong>No lottery.</strong> H-1B has a ~25% selection rate. E-3 has ~10,500 slots/year and they're never all used. <span class="step-detail">If you qualify, you get it.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-now" style="font-size:0.6rem;">KEY</span>
          <div class="step-text"><strong>Cheap and easy for employers.</strong> H-1B costs $5-10K+ in legal fees. E-3 just needs one form. <span class="step-detail">This removes the #1 reason employers say no.</span></div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-ongoing" style="font-size:0.6rem;">KEY</span>
          <div class="step-text"><strong>Fast.</strong> Processed in weeks, not months. No waiting for October start date like H-1B.</div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-ongoing" style="font-size:0.6rem;">KEY</span>
          <div class="step-text"><strong>Renewable forever.</strong> 2-year terms, no lifetime cap. Stay as long as you have a job.</div>
        </div>
        <div class="step-item">
          <span class="step-urgency urgency-soon" style="font-size:0.6rem;">KEY</span>
          <div class="step-text"><strong>Your biology degree qualifies you.</strong> The job needs to require a bachelor's. Biotech marketing, science education, health comms &mdash; all qualify.</div>
        </div>
        <p style="margin-top:0.75rem;"><strong>What to tell employers:</strong> <em>"I'm Australian and eligible for the E-3 visa &mdash; it's faster, cheaper, and simpler than H-1B, with no lottery. You just file one form."</em></p>
      </div>
    </details>

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

    <div class="search-wrap">
      <span class="search-icon">&#128269;</span>
      <input class="search-input" id="search-input" type="text" placeholder="Search across all files..." />
    </div>
    <div class="search-results" id="search-results" style="display:none;"></div>

    <div id="main-content">
    <div class="tabs" id="tabs"></div>
    <p class="section-desc" id="section-desc"></p>
    <div class="file-list" id="file-list"></div>
    <div class="content-area" id="content-area">
      <div class="content-back" id="back-btn">&larr; Back to files</div>
      <div class="md-content" id="md-content"></div>
    </div>
    </div><!-- /main-content -->
  </div>

  <button class="scroll-top" id="scroll-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Back to top">&uarr;</button>

  <script>
    let sections = [];
    let activeSection = 0;
    let allFilesCache = {}; // cache raw file content for search

    async function load() {
      const res = await fetch('/api/sections');
      sections = await res.json();
      renderTabs();
      renderFiles();
      // Preload all file content for search
      preloadFiles();
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
      el.classList.add('fade-in');

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
      document.getElementById('search-results').style.display = 'none';
      document.getElementById('main-content').style.display = '';
      document.getElementById('md-content').innerHTML = data.html;
      var ca = document.getElementById('content-area');
      ca.classList.add('visible');
      ca.classList.add('fade-in');

      // Handle links: anchor links scroll in-page, external links open in new tab
      document.querySelectorAll('.md-content a').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('#')) {
          // Anchor link — scroll to the element
          a.removeAttribute('target');
          a.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = href.slice(1);
            // Try exact match first, then try collapsing double dashes to single
            var targetEl = document.getElementById(targetId)
              || document.getElementById(targetId.replace(/--/g, '-'));
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

    // Search functionality
    async function preloadFiles() {
      for (var s of sections) {
        for (var f of s.files) {
          try {
            var res = await fetch('/api/file/' + f.dir + '/' + f.filename);
            var data = await res.json();
            allFilesCache[f.dir + '/' + f.filename] = { raw: data.raw, name: f.name, dir: f.dir, filename: f.filename };
          } catch(e) {}
        }
      }
    }

    var searchTimeout;
    document.getElementById('search-input').addEventListener('input', function(e) {
      clearTimeout(searchTimeout);
      var q = e.target.value.trim();
      if (!q || q.length < 2) {
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('main-content').style.display = '';
        return;
      }
      searchTimeout = setTimeout(function() { doSearch(q); }, 200);
    });

    function doSearch(query) {
      var results = [];
      var ql = query.toLowerCase();
      var keys = Object.keys(allFilesCache);
      for (var i = 0; i < keys.length; i++) {
        var file = allFilesCache[keys[i]];
        var lines = file.raw.split('\\n');
        for (var j = 0; j < lines.length; j++) {
          if (lines[j].toLowerCase().indexOf(ql) !== -1) {
            results.push({ name: file.name, dir: file.dir, filename: file.filename, line: lines[j], lineNum: j });
            break; // one result per file
          }
        }
      }

      var el = document.getElementById('search-results');
      var mainEl = document.getElementById('main-content');

      if (results.length === 0) {
        el.innerHTML = '<div class="loading">No results for "' + query + '"</div>';
        el.style.display = '';
        mainEl.style.display = 'none';
        return;
      }

      el.innerHTML = results.map(function(r) {
        var ctx = r.line.trim().substring(0, 150).replace(/</g, '&lt;');
        var escaped = query.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
        try { ctx = ctx.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>'); } catch(e) {}
        return '<div class="search-result-item" data-dir="' + r.dir + '" data-file="' + r.filename + '">' +
          '<div class="search-result-title">' + r.name + '</div>' +
          '<div class="search-result-context">' + ctx + '</div>' +
        '</div>';
      }).join('');

      el.style.display = '';
      el.classList.add('fade-in');
      mainEl.style.display = 'none';

      el.querySelectorAll('.search-result-item').forEach(function(item) {
        item.addEventListener('click', function() {
          document.getElementById('search-input').value = '';
          el.style.display = 'none';
          mainEl.style.display = '';
          openFile(item.dataset.dir, item.dataset.file);
        });
      });
    }

    // Dark mode toggle — persists in localStorage
    function toggleDark() {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme') === 'dark';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
      document.querySelector('.dark-toggle').innerHTML = isDark ? '&#9790;' : '&#9788;';
    }

    // Scroll-to-top button visibility
    window.addEventListener('scroll', function() {
      var btn = document.getElementById('scroll-top');
      if (window.scrollY > 400) { btn.classList.add('visible'); }
      else { btn.classList.remove('visible'); }
    });

    // Restore saved theme
    (function() {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.querySelector('.dark-toggle').innerHTML = '&#9788;';
      }
    })();

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
