"""Stamp shared parts into every page of the Kal’s Digital site.

The HTML pages are the source of truth for their own content. This script only
rewrites the regions between build markers:

    <!-- build:head -->   ... <!-- /build:head -->    title, meta, canonical, Open Graph, icons, CSS, JS
    <!-- build:header --> ... <!-- /build:header -->  partials/header.html (with aria-current set)
    <!-- build:icons -->  ... <!-- /build:icons -->   partials/icons.html
    <!-- build:footer --> ... <!-- /build:footer -->  partials/footer.html

It also writes sitemap.xml and robots.txt from site.json.

Usage (Python 3.10+, standard library only):
    python tools/build.py           rewrite files
    python tools/build.py --check   exit 1 if any file is out of date (used by tests)

To move the site to its own domain, change "origin" in site.json and run the build.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = re.compile(r"(<!-- build:(\w+) -->)(.*?)(<!-- /build:\2 -->)", re.S)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def short_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def attr(value: str) -> str:
    return html.escape(value, quote=True)


def jsonld_home(site: dict) -> str:
    origin = site["origin"]
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": origin + "/#organization",
                "name": "Kal’s Digital",
                "url": origin + "/",
                "logo": origin + "/assets/brand/KalsDigital_AppIcon_olive_1024.svg",
                "description": "A digitalization consultancy combining technology, design and systems thinking to improve how businesses present themselves, connect with customers and operate.",
                "slogan": "We make businesses look better, feel smarter, and become easier to buy from.",
                "sameAs": ["https://www.instagram.com/kals_digital/"],
                "founder": {"@type": "Person", "name": "Kaalim", "jobTitle": "Founder", "url": origin + "/about/#founder"},
                "contactPoint": [
                    {"@type": "ContactPoint", "contactType": "sales", "telephone": "+234-903-292-3267", "availableLanguage": "English"}
                ],
                "makesOffer": [
                    {"@type": "Offer", "name": "KARD Pack", "price": "170000", "priceCurrency": "NGN", "url": origin + "/products/kard/",
                     "description": "100 printed cards, a custom landing page and a professional email address",
                     "itemOffered": {"@type": "Service", "name": "KARD"}},
                    {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Slotù", "url": "https://getslotu.vercel.app/"}},
                ],
            },
            {"@type": "WebSite", "@id": origin + "/#website", "url": origin + "/", "name": "Kal’s Digital", "publisher": {"@id": origin + "/#organization"}},
        ],
    }
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "</script>"


def render_head(site: dict, page: dict) -> str:
    origin = site["origin"]
    url = origin + page["path"]
    image = origin + page.get("image", site["default_image"])
    image_alt = page.get("image_alt", site["default_image_alt"])
    css = "/assets/css/site.css?v=" + short_hash(ROOT / "assets/css/site.css")
    js = "/assets/js/site.js?v=" + short_hash(ROOT / "assets/js/site.js")
    lines = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        f"<title>{html.escape(page['title'])}</title>",
        f'<meta name="description" content="{attr(page["description"])}">',
    ]
    if page.get("noindex"):
        lines.append('<meta name="robots" content="noindex">')
    else:
        lines.append(f'<link rel="canonical" href="{attr(url)}">')
    lines += [
        '<meta name="theme-color" content="#F6F5EF">',
        '<meta name="format-detection" content="telephone=no">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:site_name" content="{attr(site["site_name"])}">',
        f'<meta property="og:locale" content="{attr(site["locale"])}">',
        f'<meta property="og:title" content="{attr(page["title"])}">',
        f'<meta property="og:description" content="{attr(page["description"])}">',
        f'<meta property="og:url" content="{attr(url)}">',
        f'<meta property="og:image" content="{attr(image)}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{attr(image_alt)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<link rel="icon" href="/favicon.ico" sizes="32x32">',
        '<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/KalsDigital_Favicon_olive_32.png">',
        '<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon-180.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        # Preload every face the pages use, so they arrive together and the page is laid out
        # once rather than once per late font.
        *[f'<link rel="preload" href="/assets/fonts/{f}.woff2" as="font" type="font/woff2" crossorigin>' for f in (
            "instrument-serif-latin-400-normal", "instrument-serif-latin-400-italic", "dm-sans-latin-400-normal",
            "dm-sans-latin-500-normal", "outfit-latin-600-normal", "dm-mono-latin-500-normal")],
        f'<link rel="stylesheet" href="{css}">',
        f'<script src="{js}" defer></script>',
    ]
    if page.get("jsonld") == "home":
        lines.append(jsonld_home(site))
    return "\n" + "\n".join(lines) + "\n"


def render_header(page: dict) -> str:
    out = read(ROOT / "partials/header.html")
    nav = page.get("nav")
    if nav:
        out = out.replace(f'data-nav="{nav}">', f'data-nav="{nav}" aria-current="page">')
    return "\n" + out.strip() + "\n"


def render_partial(name: str) -> str:
    return "\n" + read(ROOT / f"partials/{name}.html").strip() + "\n"


def build_page(site: dict, page: dict) -> tuple[Path, str, str]:
    path = ROOT / page["file"]
    before = read(path)
    found = set()

    def sub(match: re.Match) -> str:
        name = match.group(2)
        found.add(name)
        if name == "head":
            body = render_head(site, page)
        elif name == "header":
            body = render_header(page)
        elif name in ("icons", "footer"):
            body = render_partial(name)
        else:
            raise SystemExit(f"{page['file']}: unknown build marker '{name}'")
        return match.group(1) + body + match.group(4)

    after = MARKER.sub(sub, before)
    missing = {"head", "header", "icons", "footer"} - found
    if missing:
        raise SystemExit(f"{page['file']}: missing build markers {sorted(missing)}")
    return path, before, after


def sitemap(site: dict) -> str:
    urls = [p for p in site["pages"] if not p.get("noindex")]
    rows = "\n".join(f"  <url><loc>{html.escape(site['origin'] + p['path'])}</loc></url>" for p in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}\n</urlset>\n'


def robots(site: dict) -> str:
    return f"User-agent: *\nAllow: /\n\nSitemap: {site['origin']}/sitemap.xml\n"


def main() -> int:
    check = "--check" in sys.argv
    site = json.loads(read(ROOT / "site.json"))
    outputs: list[tuple[Path, str, str]] = [build_page(site, p) for p in site["pages"]]
    for name, text in (("sitemap.xml", sitemap(site)), ("robots.txt", robots(site))):
        path = ROOT / name
        outputs.append((path, read(path) if path.exists() else "", text))

    stale = [p for p, before, after in outputs if before != after]
    if check:
        for p in stale:
            print("out of date:", p.relative_to(ROOT))
        print("build check:", "FAIL" if stale else "PASS", f"({len(outputs)} files)")
        return 1 if stale else 0
    for path, before, after in outputs:
        if before != after:
            path.write_text(after, encoding="utf-8", newline="\n")
            print("wrote", path.relative_to(ROOT))
    print(f"build: {len(stale)} of {len(outputs)} files updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
