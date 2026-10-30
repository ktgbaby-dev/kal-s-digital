# Kal’s Digital corporate website

The website of Kal’s Digital, a digitalization consultancy, and the home of its two products, KARD and Slotù.

Static HTML, one stylesheet, one small script and one Vercel function for the contact form. No framework and no dependencies to install.

```bash
python -m http.server 5670 --bind 127.0.0.1   # preview
python tools/build.py                          # after editing partials/, site.json, CSS or JS
python tools/check_site.py                     # links, images, headings, copy rules
node --test tests/contact.test.mjs             # contact API
```

- [Architecture](KALS_DIGITAL_WEBSITE_ARCHITECTURE.md)
- [Content and portfolio](KALS_DIGITAL_CONTENT_AND_PORTFOLIO.md)
- [Run, test and deploy](KALS_DIGITAL_DEPLOYMENT.md)

Pushing to `main` deploys to production on Vercel (`kal-s-digital`).
