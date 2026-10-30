"""Static checks for the Kal’s Digital site (Python 3.10+, standard library only).

    python tools/check_site.py

Checks every page listed in site.json for:
  - internal links and assets that resolve to real files (and #fragments that exist)
  - images with alt text and width/height (no layout shift)
  - exactly one h1, and no skipped heading levels
  - unique titles and descriptions of sensible length
  - no inline style attributes (the Content-Security-Policy forbids them)
  - no placeholder text or banned claims (lorem ipsum, TODO, "coming soon", Slotù Pro, card payments...)
  - official product spellings in visible text (KARD, Slotù, Kal’s Digital)
Exits 1 if anything fails.
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent

PLACEHOLDERS = [r"lorem", r"ipsum", r"\bTODO\b", r"\bTBD\b", r"coming soon", r"\[(insert|year|name|client)", r"your text here", r"placeholder"]
BANNED_CLAIMS = [
    r"slot[uù] pro", r"paystack", r"card payment(?!s and automatic confirmation are not)", r"pay by card",
    r"automatic(ally)? confirm(?!ation are not)", r"guarantee", r"#1\b", r"revolutionary", r"world[- ]class", r"award",
    r"testimonial", r"\d+\s*%\s*(more|increase|growth)", r"@kalsdigital\.com", r"kalsdigital\.com",
]
# Sentences that mention a banned word only to rule it out.
ALLOWED_PHRASES = ["No made-up statistics, testimonials or guarantees"]
SPELLING = [(r"\bSlotu\b", "Slotù"), (r"\bKard\b", "KARD"), (r"Kal's Digital", "Kal’s Digital (typographic apostrophe)"), (r"KAL[’']S DIGITAL", "Kal’s Digital")]


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.ids: set[str] = set()
        self.imgs: list[dict] = []
        self.headings: list[int] = []
        self.styles = 0
        self.text: list[str] = []
        self._skip = 0
        self.title = ""
        self._in_title = False
        self.description = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        if "style" in a:
            self.styles += 1
        if tag in ("a", "link") and a.get("href"):
            if not (tag == "link" and a.get("rel") in ("canonical",)):
                self.links.append(a["href"])
        if tag in ("script", "img", "source") and a.get("src"):
            self.links.append(a["src"])
        if tag == "img":
            self.imgs.append(a)
        if tag == "use" and a.get("href"):
            self.links.append(a["href"])
        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append(int(tag[1]))
        if tag in ("script", "style", "svg"):
            self._skip += 1
        if tag == "title":
            self._in_title = True
        if tag == "meta" and a.get("name") == "description":
            self.description = a.get("content", "")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "svg") and self._skip:
            self._skip -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self._skip:
            self.text.append(data)


def resolve(page_file: Path, href: str) -> Path | None:
    parts = urlsplit(href)
    if parts.scheme or parts.netloc or href.startswith(("mailto:", "tel:")):
        return None
    path = parts.path
    if not path:
        return page_file
    target = (ROOT / path.lstrip("/")) if path.startswith("/") else (page_file.parent / path)
    if path.endswith("/"):
        target = target / "index.html"
    return target


def main() -> int:
    site = json.loads((ROOT / "site.json").read_text(encoding="utf-8"))
    problems: list[str] = []
    parsed: dict[Path, Page] = {}
    for p in site["pages"]:
        f = ROOT / p["file"]
        pg = Page()
        pg.feed(f.read_text(encoding="utf-8"))
        parsed[f] = pg

    titles: dict[str, str] = {}
    for f, pg in parsed.items():
        rel = f.relative_to(ROOT).as_posix()
        for href in pg.links:
            target = resolve(f, href)
            if target is None:
                continue
            frag = urlsplit(href).fragment
            if not target.exists():
                problems.append(f"{rel}: broken link or asset {href}")
            elif frag and target.suffix == ".html":
                other = parsed.get(target)
                if other is None:
                    other = Page(); other.feed(target.read_text(encoding="utf-8"))
                if frag not in other.ids:
                    problems.append(f"{rel}: missing #{frag} in {href}")
        for img in pg.imgs:
            if "alt" not in img:
                problems.append(f"{rel}: image without alt: {img.get('src')}")
            if not img.get("width") or not img.get("height"):
                problems.append(f"{rel}: image without width/height: {img.get('src')}")
        if pg.headings.count(1) != 1:
            problems.append(f"{rel}: expected one h1, found {pg.headings.count(1)}")
        prev = 0
        for level in pg.headings:
            if prev and level > prev + 1:
                problems.append(f"{rel}: heading level jumps from h{prev} to h{level}")
            prev = level
        if pg.styles:
            problems.append(f"{rel}: {pg.styles} inline style attribute(s)")
        if not (20 <= len(pg.title) <= 65):
            problems.append(f"{rel}: title length {len(pg.title)}: {pg.title}")
        if not (70 <= len(pg.description) <= 200):
            problems.append(f"{rel}: description length {len(pg.description)}")
        if pg.title in titles:
            problems.append(f"{rel}: duplicate title with {titles[pg.title]}")
        titles[pg.title] = rel
        text = " ".join(" ".join(pg.text).split())
        for phrase in ALLOWED_PHRASES:
            text = text.replace(phrase, "")
        for pat in PLACEHOLDERS:
            if re.search(pat, text, re.I):
                problems.append(f"{rel}: placeholder text matches /{pat}/")
        for pat in BANNED_CLAIMS:
            m = re.search(pat, text, re.I)
            if m:
                problems.append(f"{rel}: unsupported claim matches /{pat}/: ...{text[max(0, m.start()-40):m.end()+40]}...")
        for pat, want in SPELLING:
            if re.search(pat, text):
                problems.append(f"{rel}: spelling /{pat}/ should be {want}")

    for line in problems:
        print("FAIL", line)
    print(f"site check: {'FAIL' if problems else 'PASS'} ({len(parsed)} pages, {len(problems)} problems)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
