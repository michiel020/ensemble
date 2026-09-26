# withensemble.nl

Statische website van Ensemble (V6.9, design system "Blauw & Redactioneel"). Geen build-stap: `index.html` + `assets/`.

- Live: https://withensemble.nl (Netlify-site `withensemble`, https://withensemble.netlify.app)
- Bron van copy, design system en versiegeschiedenis: `~/Documents/# Claude/Projecten/Duo propositie/` (Web/v6.x)
- `styleguide.html` — levende styleguide (kleur, type, componenten)
- `_headers` — cache- en beveiligingsheaders voor Netlify · `robots.txt`, `sitemap.xml`

Lokaal bekijken: `python3 -m http.server 8000` in deze map, dan http://localhost:8000.

## Feedbackmodus

Open de site met `?feedback` (bijv. https://withensemble.nl/?feedback) om feedback te geven: klik een onderdeel aan, kies een soort, schrijf je opmerking en verstuur. Blijft aan zolang het tabblad open is; uit met de knop "Stoppen" of `?feedback=uit`. Gewone bezoekers zien niets.

- Code: `assets/feedback.js` + `assets/feedback.css` (css wordt alleen geladen in feedbackmodus)
- Opslag: Netlify Forms, formulier `feedback` (verborgen formulier onderaan `index.html` — veldnamen gelijk houden met `feedback.js`)
- Ophalen: `node export-feedback.mjs` in `~/Documents/# Claude/Projecten/Duo propositie/Feedback/` → werklijst `feedback-JJJJ-MM-DD.md`
