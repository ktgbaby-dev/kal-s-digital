# Kal’s Digital website: run, test and deploy

Last updated 30 October 2026. No secrets belong in this file.

## 1. Run locally

Requirements: Python 3.10+ (static preview and build), Node.js 20+ (API preview and tests). No `npm install` is needed for the site itself.

Static preview, exactly the files Vercel serves (the contact form uses its WhatsApp route because there is no API):

```bash
python -m http.server 5670 --bind 127.0.0.1
```

Open http://127.0.0.1:5670. In the Claude desktop app the same server is the `kals-digital` entry in the workspace `.claude/launch.json`.

Preview with the contact API (port 5671):

```bash
node tools/dev-server.mjs
```

`MOCK_EMAIL=ok node tools/dev-server.mjs` switches the form to its email route with a fake provider, so you can try it without sending anything. `MOCK_EMAIL=fail` shows the failure message.

## 2. Build

Pages are plain HTML. After changing `partials/`, `site.json`, `assets/css/site.css` or `assets/js/site.js`, run:

```bash
python tools/build.py
```

It rewrites the marked head, header, icon and footer regions of every page, updates the cache-busting hashes, `sitemap.xml` and `robots.txt`. `python tools/build.py --check` exits 1 if anything is out of date. Vercel runs no build step.

Share images and app icons (only when the brand assets or wording change), with the static preview running:

```bash
node tools/og/render.mjs
```

## 3. Test

| Command | What it checks | Needs |
|---|---|---|
| `python tools/build.py --check` | Every page is built from the current partials and settings | Python |
| `python tools/check_site.py` | Internal links and #anchors, image alt and sizes, one h1 and heading order, title and description lengths, no inline styles, no placeholder text or banned claims, product spellings | Python |
| `node --test tests/contact.test.mjs` | Contact API: configured/unconfigured, validation, honeypot, rate limit, provider failure, no-JavaScript posts (11 tests) | Node |
| `node tests/browser.mjs` | axe (WCAG 2.2 AA + best practice) on every page at 1440 px and 390 px, no horizontal overflow at 320/375/768/1024/1280/1920, skip link and focus ring, touch-target heights, small-screen menu, reveal-on-scroll, contact form WhatsApp route (59 checks) | Node, Chrome, static preview on 5670 |
| `node tests/email-mode.mjs` | Contact form email route against a mock provider (4 checks) | Node, Chrome |

The browser tests borrow `playwright-core` and `axe-core` read-only from `../kals-pipeline/modules/testing`. To use another install, set `PLAYWRIGHT_FROM` to a `package.json` that depends on both. Lighthouse can be run the same way from that folder’s `node_modules/lighthouse/cli/index.js`.

Results on 30 October 2026 (local static server, so no compression):

- build check PASS (12 files); site check PASS (10 pages, 0 problems)
- contact API 11/11; browser checks 59/59; email-route checks 4/4
- Lighthouse, mobile: performance 90–94, accessibility 100, best practices 100 (96 on Contact, because the static server has no `/api/contact` and logs a 404), SEO 100. Desktop: performance 99–100, other categories 100.

## 4. Preview a deployment

The Vercel project is linked to GitHub, so every pushed branch gets its own preview deployment:

```bash
git push -u origin redesign-2026
```

That URL is protected by Vercel Authentication (you sign in with the Vercel account to view it). Pushing is your decision: the GitHub repository is **public**, so everything committed becomes publicly visible on GitHub, including these documents.

## 5. Existing Vercel project (discovered read-only)

| Item | Value |
|---|---|
| Project | `kal-s-digital` (`prj_JGtwF2u8QtPRSuBnwW6HX2g9aRl4`) |
| Team | KTG (`ktg5`) |
| Git | `ktgbaby-dev/kal-s-digital`, production branch `main` |
| Framework preset | none (static), Node.js 24.x |
| Domains | kal-s-digital.vercel.app (production, public), kal-s-digital-ktg5.vercel.app, kal-s-digital-git-main-ktg5.vercel.app |
| Protection | Vercel Authentication on all deployments except custom domains; the production address answers publicly |
| Current production | the earlier one-page site |

**Merging or pushing to `main` deploys to production immediately.** Do that only when you approve the launch.

## 6. Environment variables

None are needed for the site to work. To switch the contact form from WhatsApp to email, add these to the `kal-s-digital` project (Production; add them to Preview too if you want to test there), then redeploy:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | A new Resend key created for this website only. Do not reuse a client’s booking key or anything from Slotù |
| `CONTACT_TO_EMAIL` | The inbox that should receive enquiries |
| `CONTACT_FROM_EMAIL` | Optional. A sender on a domain verified in Resend. Until a domain is verified, leave it out: the default test sender can only deliver to the email address that owns the Resend account, so `CONTACT_TO_EMAIL` must be that address |

Check it: `https://<deployment>/api/contact` should return `{"email":true}`. Then send one real test enquiry and confirm it arrives before relying on it.

## 7. Custom domain (not done; needs your approval)

State found on 30 October 2026: `kalsdigital.com` is registered at Spaceship and listed in the Vercel team, attached to no project, with no mail records; requests to it time out. Nothing about the domain or DNS was changed.

When you decide to launch on it:

1. Confirm who controls DNS at Spaceship and what the domain currently points to.
2. In Vercel, add `kalsdigital.com` (and `www.kalsdigital.com` as a redirect) to the `kal-s-digital` project and create the DNS records Vercel shows, at Spaceship.
3. Change `"origin"` in `site.json` to `https://kalsdigital.com` and run `python tools/build.py`. This updates canonical links, Open Graph URLs, the sitemap and robots.txt (the share images don’t contain the domain, so they stay as they are). Commit and deploy.
4. Optional, separately: set up a mailbox on the domain, then verify the domain in Resend and set `CONTACT_FROM_EMAIL` to an address on it.

## 8. Deployment blockers and decisions

| Item | Status |
|---|---|
| Your approval to deploy to production | **Required** |
| Client permission to feature the five portfolio projects | **Not confirmed** (see KALS_DIGITAL_CONTENT_AND_PORTFOLIO.md) |
| Vercel plan | The team is on the Hobby plan, which Vercel limits to non-commercial use. A commercial company site should move to Pro (already planned in your Slotù notes) |
| Enquiry inbox | Not chosen. Until it is, the form sends visitors to WhatsApp, which works today |
| Custom domain | Not attached, by design. The site works on kal-s-digital.vercel.app |
| Privacy notice | Written; not legally reviewed |
