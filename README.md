# Bean Hunt Website

Public marketing site for Bean Hunt.

## Overview

Bean Hunt is a coffee passport for iPhone: find great cafés, stamp every coffee you try, and build a record of the places worth going back to.
This repository hosts the static landing website plus the legal and account pages the app links to.

## Stack

- Static HTML/CSS
- GitHub Pages hosting
- Custom domain: `www.beanhunt.app`

## Project Structure

- `index.html` - landing page (inline CSS, SEO meta, JSON-LD for the app and FAQ)
- `assets/intro/` - the hero's animated intro: a live canvas engine (`bean-intro.js`, generated), its audio track, icon and poster. Source and rebuild steps live in the app repo at `marketing/video/` (`export_site.py` writes this folder).
- `assets/` - screenshots (cropped from the App Store set), app icon, and the Open Graph share image
- `privacy/`, `terms/` - legal pages linked from the app and App Store listing (keep these URLs)
- `auth/reset-password/`, `auth/verify-email/` - account flows linked from app emails (keep these URLs; `noindex`, not in the sitemap)
- `robots.txt`, `sitemap.xml` - crawl rules and sitemap for Google Search Console
- `CNAME` - custom domain for GitHub Pages
- `.nojekyll` - disables Jekyll processing on GitHub Pages

## Local Preview

Open `index.html` in a browser, or run any static file server from this directory.

## Deployment

Deploys from the `main` branch via GitHub Pages.

## Related Services

- API: `https://api.beanhunt.app`
- App repository (private): Bean Hunt mobile + backend
