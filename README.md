# RythuConnect — Showcase Site

**Design Thinking Ideathon 2026 · Team GOAT · Team 5**

A judge-facing showcase for **RythuConnect**, a low-cost Flutter + SMS companion app for Rythu Bazaar, Mehdipatnam (Hyderabad).

---

## What It Is

A single-page static site demonstrating the core features of RythuConnect:

| Feature | Demo interaction |
|---|---|
| Live officer-synced price board | Edit prices as the officer; shopper view updates live; run a spot-check |
| QR vendor verification | Tap "Scan QR" on any vendor card to see Verified / Not Registered |
| Live parking counter | Enter / Leave buttons update free-slot counts with colour-coded status |
| SMS / USSD mode | Tap command keys (PRICE, PARK, VERIFY, RATE) to simulate SMS replies |
| Vegetable & Vendor Reviews | Rate produce and QR-verified vendors; view averages and auto-flagged feedback |

> **All data on this site is demo data only.** No real network calls are made.

---

## How to Run

**Option 1 — open directly:**
```
double-click index.html
```
No build step, no dependencies, no server required.

**Option 2 — local server (avoids browser CORS on some systems):**
```bash
# Python 3
python -m http.server 8743
# then open http://localhost:8743
```

---

## Live URL

🔗 **[https://rythuconnect2.vercel.app/](https://rythuconnect2.vercel.app/)**

---

## GitHub

[https://github.com/YasserHUB10/RythuConnet](https://github.com/YasserHUB10/RythuConnet)

---

## File Structure

```
rythuconnect-site/
├── index.html   ← markup, semantic HTML5, one page
├── style.css    ← chalkboard design system, mobile-first
├── app.js       ← demo logic, no frameworks, no APIs
└── README.md    ← this file
```

---

## Team

| Name | Role |
|---|---|
| Yasser AbdulRahman Mohammed | Team lead |
| Noraiz Ali | Member |
| Mohammed Abdul Wasay Ahmed | Member |

**B.Tech CSE (Data Science) · CSD-A**

---

## Design Notes

- Fonts: [Tiro Telugu](https://fonts.google.com/specimen/Tiro+Telugu) (display) · [Inter](https://fonts.google.com/specimen/Inter) (body)
- Palette: dark-green chalkboard · chalk-white text · turmeric yellow accent · chilli red · leaf green
- Accessibility: WCAG AA contrast, keyboard navigation, `prefers-reduced-motion` guard, skip link, `aria-live` regions
- Target: 390 px (mobile) → 1280 px (desktop), under 300 KB total
