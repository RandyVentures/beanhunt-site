# Bean Hunt Site

Static marketing site for Bean Hunt, hosted on GitHub Pages.

## Domain Setup (Cloudflare + GitHub Pages)

1. Push this repo to `main`.
2. In GitHub repo settings:
   - `Pages` -> `Build and deployment`
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` + `/ (root)`
3. In GitHub Pages custom domain, set `www.beanhunt.app`.
4. In Cloudflare DNS add:
   - `CNAME` `www` -> `<your-github-username>.github.io` (`DNS only` while validating)
5. For apex routing:
   - Add Cloudflare Redirect Rule: `beanhunt.app/*` -> `https://www.beanhunt.app/$1` (301).

## Notes

- `CNAME` file is included for GitHub Pages custom domain support.
- `.nojekyll` is included so GitHub Pages serves files as-is.
