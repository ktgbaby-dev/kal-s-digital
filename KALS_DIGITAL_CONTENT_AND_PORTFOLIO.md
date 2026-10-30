# Kal’s Digital website: content and portfolio

Last updated 30 October 2026. This file is for the business owner and is not deployed (`.vercelignore` excludes `*.md`). The GitHub repository is public, so keep personal or client details out of it.

## 1. Final page structure

| Page | URL | Title |
|---|---|---|
| Home | `/` | Kal’s Digital · Digitalization consultancy |
| What we do | `/what-we-do/` | What we do · Kal’s Digital |
| Products | `/products/` | Products: KARD and Slotù · Kal’s Digital |
| KARD | `/products/kard/` | KARD: make every introduction count · Kal’s Digital |
| Slotù | `/products/slotu/` | Slotù: portfolio and booking websites · Kal’s Digital |
| Our work | `/work/` | Our work · Kal’s Digital |
| About | `/about/` | About · Kal’s Digital |
| Contact | `/contact/` | Start a project · Kal’s Digital |
| Privacy | `/privacy/` | Privacy · Kal’s Digital |
| Not found | `/404.html` | Page not found · Kal’s Digital (not indexed) |

Main navigation: Home, What we do, Products, Our work, About, Contact, plus the “Start a project” button.

## 2. Sources of the copy

All copy is new and written in the brand voice, built only from these sources:

- Kal’s Digital Brand Guidelines, Edition 1.0 (Downloads/Kals_Digital_Brand_Guidelines.pdf): essence, mission, point of view, personality, Woven K anatomy, sign-off, product spellings, contacts.
- Kal’s Digital Corporate Capabilities Brochure (Downloads/Kals_Digital_Corporate_Brochure.pdf, 27 Oct 2026): capability problems and values, before/after touchpoints, KARD and QR-menu descriptions, Slotù audiences, process and partnership principles.
- Slotù Development Status and Architecture Report (30 Oct 2026) and the live Slotù portal’s Features and How it works pages: what Slotù does today and what it does not.
- The five client sites’ own source code and live pages (portfolio facts).
- Your brief for this website.

Nothing on the site invents a statistic, testimonial, award, client result, price, guarantee, timeline or company history. `tools/check_site.py` fails the build if placeholder text or the banned claims (Slotù Pro, Paystack, card payments, guarantees, “#1”, awards, testimonials, kalsdigital.com addresses) appear.

## 3. Product descriptions as published

**KARD** (“Make every introduction count.”): a connected physical and digital presence. Three variants:

1. *Professional and business KARD*: 100 professionally designed printed cards, a QR code that opens a custom landing page, and a professional email on the client’s own domain “subject to domain and email setup”.
2. *KARD websites*: tailored websites built around each client’s identity, with four live examples (Vistosa The Brand, Forge Visuelle, ENLUX, GLAM BY OYIN).
3. *KARD restaurant QR menu*: a QR code at the table opens a menu designed around the restaurant’s identity. The page states that online ordering, payments and other advanced features are not part of the standard QR menu.

**Price (approved by the owner on 30 Oct 2026, from the corporate brochure):** KARD Pack ₦170,000 for 100 printed cards, a custom landing page and a professional email. It appears in the KARD hero, the standard-KARD price card, the KARD FAQ, the products overview, the home page KARD panel and the home page structured data (`Offer`, 170000 NGN). KARD websites and restaurant QR menus are described as quoted on scope. No turnaround or holder specification is published.

The ₦ sign is not in any of the brand font files (including Outfit), so browsers draw that one character in the system font.

**Slotù** (“Show your work. Fill your calendar.”): portfolio and booking websites for appointment-based professionals. Published capabilities, all verified on the live portal and on GLAM BY OYIN: portfolio by category with photos and video; services with prices and durations; only free times offered and no double booking; booking codes; deposits by bank transfer with receipt upload; owner confirms in a private owner desk; unpaid holds release automatically; separate logins; owner edits services, prices and hours; booking emails to the owner “set up and tested with a real email before we say it works”; automated pre-launch checks. The page states plainly that card payments and automatic confirmation are not part of Slotù today. The main call to action is “Explore Slotù” to https://getslotu.vercel.app/. Slotù pricing and the intake form are not duplicated.

## 4. Service categories

1. **Digital presence**: website design and development; business landing pages; search engine optimization; social media setup and optimization (management where agreed).
2. **Brand and communication**: brand strategy; visual identity; graphic design and visual communication; content creation and creative campaigns.
3. **Digital systems**: digital customer experiences (QR, enquiry and booking journeys); workflow automation (scoped after seeing the current work); business process improvement; custom digital solutions.

Plus three ways to engage: a single service, a product, or a tailored engagement.

## 5. Portfolio projects included

All five are live, were built by Kal’s Digital, and appear on Home, KARD (four of them) and Our work. Each keeps its own identity; the portfolio frames are neutral.

| Project | Repository | What the site says we built | Live URL (verified 30 Oct 2026) | Assets used |
|---|---|---|---|---|
| GLAM BY OYIN | `glambyoyin/`, `glambyoyin-bookings/` | Brand site with films, two-collection portfolio and story; separate booking site with prices, deposits by transfer and receipt upload, booking codes, owner desk with separate logins, email alerts and reminders; foundation of Slotù | https://glambyoyin.vercel.app/ (HTTP 200, Vercel project `glambyoyin`) and https://glambyoyin-bookings.vercel.app/ (200) | Screenshots of both live sites (desktop, phone, full-page crop) |
| ENLUX | `enlux/` | Single-page brand site in chapters, collection section, WhatsApp and email contact, logo files prepared for the web | https://enlux.vercel.app/ (200, canonical in its source) | Screenshots |
| Forge Visuelle | `forge-visuelle/` | Three-page site: services, audiences, founder story, enquiry form that opens the visitor’s email app | https://forge-visuelle.vercel.app/ (200, domain of Vercel project `forge-visuelle`) | Screenshots |
| Vistosa The Brand | `vistosa/` | Three-page site: four-step dye process, lookbook, commission route and enquiry form | https://vistosa-pi.vercel.app/ (200, domain of Vercel project `vistosa`). Note: vistosa.vercel.app is someone else’s site | Screenshots |
| KTG MUSIC | `ktg-music/` (preview mirror of the deployed site) | Single page as a broadcast, Spotify tracks, performance videos, fan sign-up form, own domain | https://ktgmusic.site/ (200) | Screenshots |

Full-page previews are cropped above each site’s contact section and footer, so no client contact or payment details appear in any image on this site.

## 6. Private asset inventory

| Asset | Location | Status |
|---|---|---|
| Official logo SVGs, Woven K, Kente-fill K, Kal’s Weave tile, favicon, app icon | “Kal’s Digital” Design System artifact on claude.ai (asset store) | Used. The brand-kit zip named in the guidelines (Kals_Digital_Brand_Kit.zip) was **not found** on this computer; the same master files were taken from the artifact |
| Brand fonts (8 WOFF2) | Same artifact | Used, self-hosted |
| Ink colourway of Kal’s Weave as SVG | Not found (only a PNG swatch exists) | Not used; the olive tile is used everywhere |
| Client site screenshots | Captured from the live sites, `assets/work/` | Used |
| Slotù portal screenshots | Captured from getslotu.vercel.app (home, phone) | Used |
| KARD card mockups for Vistosa and Forge Visuelle | Downloads/KARD/ (10 PNG files) | **Withheld**. They show the clients’ personal email addresses and phone numbers, are labelled “concept mockup”, and include a desk holder that is not part of the confirmed KARD offer |
| GLAM BY OYIN films and photos | `glambyoyin/assets/` | Not copied; screenshots are enough and the films are large |
| Restaurant QR menu examples | None found in the workspace (only an internal image SOP) | No visual used; the section is explained with a step diagram |
| Older Kal’s Digital graphics (Documents/kal’s/) | Pre-guidelines identity | Not used; superseded by the official identity |
| KARD Radar, God’s Eye, kals-pipeline | Internal tools | Not mentioned or shown anywhere on the site |

## 7. Client permissions

The owner confirmed on 30 October 2026 that permission is granted for all five projects.

| Project | Permission status | Notes |
|---|---|---|
| GLAM BY OYIN | Granted (owner, 30 Oct 2026) | Includes the line that its booking system “became the foundation of Slotù” |
| ENLUX | Granted (owner, 30 Oct 2026) | |
| Forge Visuelle | Granted (owner, 30 Oct 2026) | The client’s founder is not named on this site |
| Vistosa The Brand | Granted (owner, 30 Oct 2026) | |
| KTG MUSIC | Granted (owner, 30 Oct 2026) | |

To remove a project, delete its block from `work/index.html` (and its card on the home page and KARD page), then run `python tools/build.py` and `python tools/check_site.py`.

## 8. Decisions and open points

Decided by the owner on 30 October 2026:

- **Client permissions:** granted for all five projects.
- **Enquiry inbox:** the owner’s personal inbox, until kalsdigital.com is renewed. It is stored only as `CONTACT_TO_EMAIL` on the Vercel project and is not printed on the site or in this repository. The old `connect@kalsdigital.com` stays removed.
- **KARD price:** publish ₦170,000 (done).
- **Vercel plan:** stay on Hobby until the first real paying client.
- **Launch:** approved; the custom domain will be connected after renewal.

Still open:

1. **Email delivery.** Needs a Resend API key added by the owner (see KALS_DIGITAL_DEPLOYMENT.md, section 6). Until then the form uses WhatsApp.
2. **Location.** The old site said “Lagos, Nigeria”. The new site only says the company is rooted in Africa and works for businesses in Nigeria. Confirm before adding a city.
3. **Founder.** The About page says only “Kal’s Digital was founded by Malik Adelu.” Add a short biography or photo only if you want one. The brand guidelines’ email signature names “Kaalim, CEO”; that name and title are not used.
4. **Privacy notice.** Written to match how the site works (no cookies or analytics, WhatsApp or email routes, rights under the Nigeria Data Protection Act 2023, retention “as long as needed”). It has not had a legal review.
5. **Restaurant QR menu.** Described from the brochure only. No live restaurant project was found. Confirm the description and whether there is a real example to show.
6. **Social channels.** Only Instagram @kals_digital is linked. The brochure also prints a Snapchat handle, which is not used.
