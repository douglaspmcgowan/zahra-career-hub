"""
Job Scraper for Zahra Amos
Searches multiple sources for jobs matching her profile and outputs clean results.

Benefits over Claude web search:
- Hits actual job listing RSS feeds and APIs
- Deduplicates across runs (tracks seen jobs in seen_jobs.json)
- Searches way more sources simultaneously
- Structured output (title, company, location, url, date)
- Can run on a schedule independently of Claude
- Filters by keywords, location, and recency
- Outputs both markdown (for the web app) and JSON (for further processing)
"""

import json
import hashlib
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

# --- Configuration ---

PROFILE = {
    "name": "Zahra Amos",
    "location": "Berkeley, CA",
    "keywords": [
        # Biotech Marketing
        "biotech marketing",
        "life science marketing",
        "pharmaceutical marketing",
        "science communications",
        "medical communications",
        # Science Education
        "science education",
        "science educator",
        "biology teacher",
        "STEM education",
        "museum educator",
        # Health / Outreach
        "health educator",
        "community outreach",
        "patient education",
        "health communications",
        # AI (non-engineering)
        "AI marketing",
        "AI community manager",
        "AI operations",
        # Summer / Athletics
        "summer camp counselor",
        "science camp",
        "camp instructor",
        "athletic coach",
        # General
        "marketing coordinator",
        "program coordinator",
        "teaching assistant biology",
    ],
    "location_terms": ["Berkeley", "Oakland", "San Francisco", "Bay Area", "East Bay", "South San Francisco", "Remote"],
    "exclude_terms": ["senior director", "VP ", "vice president", "10+ years", "principal engineer"],
}

# RSS/Atom feeds and search URLs
INDEED_RSS = "https://www.indeed.com/rss?q={query}&l=Berkeley%2C+CA&radius=25&sort=date&fromage=3"
BIOSPACE_RSS = "https://www.biospace.com/employer/rss/jobs?query={query}&location=San+Francisco+Bay+Area"

# Target company career pages to check (we'll search for these via web)
TARGET_COMPANIES = [
    "Lawrence Hall of Science",
    "California Academy of Sciences",
    "Genentech",
    "Gilead Sciences",
    "Bio-Rad",
    "23andMe",
    "Benchling",
    "10x Genomics",
    "Thermo Fisher Scientific",
    "Exploratorium",
    "Galileo camps",
    "iD Tech camps",
]

BASE_DIR = Path(__file__).parent.parent
SEEN_FILE = BASE_DIR / "tools" / "seen_jobs.json"
OUTPUT_DIR = BASE_DIR / "updates"


def load_seen():
    if SEEN_FILE.exists():
        return json.loads(SEEN_FILE.read_text())
    return {}


def save_seen(seen):
    SEEN_FILE.write_text(json.dumps(seen, indent=2))


def job_id(title, company, url):
    raw = f"{title.lower().strip()}|{company.lower().strip()}|{url.strip()}"
    return hashlib.md5(raw.encode()).hexdigest()


def fetch_rss(url, timeout=15):
    """Fetch and parse an RSS/Atom feed, return list of items."""
    jobs = []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read().decode("utf-8", errors="replace")
        root = ET.fromstring(data)

        # Handle both RSS and Atom
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        # RSS 2.0
        for item in root.findall(".//item"):
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            desc = item.findtext("description", "").strip()
            pubdate = item.findtext("pubDate", "").strip()
            company = extract_company(title, desc)
            location = extract_location(desc)

            jobs.append({
                "title": clean_title(title),
                "company": company,
                "location": location,
                "url": link,
                "date": pubdate,
                "source": "RSS",
                "description": desc[:300],
            })

        # Atom
        for entry in root.findall("atom:entry", ns):
            title = entry.findtext("atom:title", "", ns).strip()
            link_el = entry.find("atom:link", ns)
            link = link_el.get("href", "") if link_el is not None else ""
            summary = entry.findtext("atom:summary", "", ns).strip()

            jobs.append({
                "title": clean_title(title),
                "company": extract_company(title, summary),
                "location": extract_location(summary),
                "url": link,
                "date": entry.findtext("atom:updated", "", ns),
                "source": "RSS",
                "description": summary[:300],
            })
    except Exception as e:
        print(f"  [!] Error fetching {url[:80]}...: {e}")

    return jobs


def search_indeed_rss(query):
    """Search Indeed via RSS feed."""
    encoded = urllib.parse.quote(query)
    url = INDEED_RSS.format(query=encoded)
    print(f"  Searching Indeed RSS: {query}")
    return fetch_rss(url)


def search_biospace_rss(query):
    """Search BioSpace via RSS feed."""
    encoded = urllib.parse.quote(query)
    url = BIOSPACE_RSS.format(query=encoded)
    print(f"  Searching BioSpace RSS: {query}")
    return fetch_rss(url)


def clean_title(title):
    """Remove common junk from job titles."""
    title = re.sub(r"\s*-\s*new\s*$", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\s*\(.*?\)\s*$", "", title)
    return title.strip()


def extract_company(title, description):
    """Try to extract company name from title or description."""
    # Common pattern: "Job Title - Company Name"
    if " - " in title:
        parts = title.split(" - ")
        if len(parts) >= 2:
            return parts[-1].strip()
    # Common pattern: "Job Title at Company"
    if " at " in title.lower():
        parts = re.split(r"\s+at\s+", title, flags=re.IGNORECASE)
        if len(parts) >= 2:
            return parts[-1].strip()
    return "Unknown"


def extract_location(text):
    """Try to extract location from description text."""
    for loc in PROFILE["location_terms"]:
        if loc.lower() in text.lower():
            return loc
    # Try common patterns
    match = re.search(r"(?:Location|location|in)\s*:\s*([^<\n,]+)", text)
    if match:
        return match.group(1).strip()
    return "Bay Area"


def is_relevant(job):
    """Check if a job is relevant to Zahra's profile."""
    text = f"{job['title']} {job['description']} {job['company']}".lower()

    # Exclude senior/executive roles
    for term in PROFILE["exclude_terms"]:
        if term.lower() in text:
            return False

    # Check location relevance
    loc_match = any(loc.lower() in text for loc in PROFILE["location_terms"])
    if not loc_match and "remote" not in text:
        return False

    return True


def categorize(job):
    """Categorize a job for the update."""
    title_lower = job["title"].lower()
    desc_lower = job.get("description", "").lower()
    combined = f"{title_lower} {desc_lower}"

    if any(t in combined for t in ["camp", "summer", "seasonal", "counselor", "instructor"]):
        return "summer"
    if any(t in combined for t in ["biotech", "pharma", "life science", "genomic", "biology"]):
        if any(t in combined for t in ["marketing", "commercial", "brand", "content"]):
            return "hot"
        return "worth_a_look"
    if any(t in combined for t in ["education", "teach", "museum", "outreach", "stem"]):
        return "hot"
    if any(t in combined for t in ["marketing", "community", "coordinator", "communications"]):
        return "worth_a_look"
    return "worth_a_look"


def one_line_reason(job):
    """Generate a one-line reason why a job fits Zahra."""
    title_lower = job["title"].lower()
    company_lower = job["company"].lower()

    if "education" in title_lower or "teach" in title_lower:
        return "Teaching/education role — matches her passion for working with people"
    if "marketing" in title_lower and any(t in title_lower for t in ["bio", "life", "pharma", "science"]):
        return "Biology + marketing intersection — perfect combo of her degrees"
    if "marketing" in title_lower:
        return "Marketing role — directly uses her UC Berkeley certificate"
    if "camp" in title_lower or "counselor" in title_lower:
        return "Summer option — immediate income while job hunting"
    if "outreach" in title_lower or "community" in title_lower:
        return "People-facing community role — matches her strengths"
    if any(t in company_lower for t in ["genentech", "gilead", "bio-rad", "23andme", "thermo"]):
        return "Top-tier Bay Area biotech — known to sponsor visas"
    return "Bay Area role matching her background"


def generate_markdown(hot, worth, summer, stats):
    """Generate the clean markdown update."""
    now = datetime.now().strftime("%B %d, %Y")
    lines = [
        f"# Job Update — {now}",
        f"*Automated scan by Python job scraper*\n",
    ]

    if hot:
        lines.append("## Hot Finds (best matches)")
        for j in hot:
            lines.append(f"- **{j['title']}** at {j['company']} — {one_line_reason(j)} — [Apply]({j['url']})")
        lines.append("")

    if worth:
        lines.append("## Worth a Look")
        for j in worth:
            lines.append(f"- **{j['title']}** at {j['company']} — {j['location']} — [Apply]({j['url']})")
        lines.append("")

    if summer:
        lines.append("## Summer / Short-Term Options")
        for j in summer:
            lines.append(f"- **{j['title']}** at {j['company']} — [Apply]({j['url']})")
        lines.append("")

    if not hot and not worth and not summer:
        lines.append("*No new jobs found this scan. Will keep checking!*\n")

    lines.append("## Quick Stats")
    lines.append(f"- Total new listings found: {stats['total']}")
    lines.append(f"- Hot matches: {stats['hot']}")
    lines.append(f"- Sources checked: Indeed RSS, BioSpace RSS")
    lines.append(f"- Search queries run: {stats['queries']}")
    lines.append("")
    lines.append("---")
    lines.append(f"*Scanned on {now}*")
    lines.append("*Edit search terms: strategy/job-search-queries.md*")

    return "\n".join(lines)


def run():
    print("=" * 60)
    print(f"JOB SCRAPER — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Searching for: {PROFILE['name']}")
    print("=" * 60)

    seen = load_seen()
    all_jobs = []

    # Select a subset of keywords to search (rotate through them)
    # Use day of year to rotate
    day = datetime.now().timetuple().tm_yday
    keywords = PROFILE["keywords"]
    # Search 8 keywords per run, rotating
    batch_size = 8
    start_idx = (day * batch_size) % len(keywords)
    batch = []
    for i in range(batch_size):
        batch.append(keywords[(start_idx + i) % len(keywords)])

    print(f"\nSearching {len(batch)} keyword groups this run...\n")

    queries_run = 0

    # Search Indeed RSS
    print("--- Indeed RSS ---")
    for kw in batch[:5]:  # Limit to avoid rate limiting
        jobs = search_indeed_rss(kw)
        all_jobs.extend(jobs)
        queries_run += 1

    # Search BioSpace RSS
    print("\n--- BioSpace RSS ---")
    for kw in batch[:3]:
        if any(t in kw for t in ["biotech", "life science", "pharma", "bio", "science"]):
            jobs = search_biospace_rss(kw)
            all_jobs.extend(jobs)
            queries_run += 1

    print(f"\nTotal raw results: {len(all_jobs)}")

    # Filter and deduplicate
    new_jobs = []
    for job in all_jobs:
        jid = job_id(job["title"], job["company"], job["url"])
        if jid in seen:
            continue
        if not is_relevant(job):
            continue
        seen[jid] = {
            "title": job["title"],
            "company": job["company"],
            "first_seen": datetime.now().isoformat(),
        }
        new_jobs.append(job)

    print(f"New relevant jobs: {len(new_jobs)}")

    # Categorize
    hot = [j for j in new_jobs if categorize(j) == "hot"]
    worth = [j for j in new_jobs if categorize(j) == "worth_a_look"]
    summer = [j for j in new_jobs if categorize(j) == "summer"]

    stats = {
        "total": len(new_jobs),
        "hot": len(hot),
        "queries": queries_run,
    }

    # Write markdown update
    md = generate_markdown(hot, worth, summer, stats)
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Write latest
    latest_file = OUTPUT_DIR / "latest-jobs.md"
    latest_file.write_text(md)
    print(f"\nWrote update to {latest_file}")

    # Also save a dated archive
    date_str = datetime.now().strftime("%Y-%m-%d")
    archive_file = OUTPUT_DIR / f"jobs-{date_str}.md"
    archive_file.write_text(md)

    # Append to history
    history_file = OUTPUT_DIR / "history.md"
    if history_file.exists():
        with open(history_file, "a") as f:
            f.write(f"| {date_str} | {len(new_jobs)} | Indeed, BioSpace | Python scraper |\n")

    # Save seen jobs
    save_seen(seen)
    print(f"Tracking {len(seen)} total seen jobs")

    # Also save as JSON for programmatic access
    json_file = OUTPUT_DIR / "latest-jobs.json"
    json_file.write_text(json.dumps(new_jobs, indent=2, default=str))

    print("\nDone!")
    return new_jobs


if __name__ == "__main__":
    run()
