# Shahbaz Edits — private portfolio

Internal video portfolio, published on GitHub Pages behind a password.

- `docs/` is the published site: a login page (`index.html`) and `site.enc`, the whole portfolio (pages, scripts and video list) encrypted with AES-256-GCM. The key is derived from the username and password with PBKDF2-SHA256 (600,000 rounds), so nothing is readable without the login details.
- `login.html` is the source of the login page; `build-protected.cjs` builds `docs/` from the readable site in `dist/`, which is kept off GitHub.

## Updating the site
1. Update the readable site in `dist/` (local only).
2. In PowerShell: `$env:PORTFOLIO_USER='…'; $env:PORTFOLIO_PASSWORD='…'; node build-protected.cjs`
3. Commit and push `docs/`.

Changing the password: rebuild with a new password; the old one stops working as soon as the new `docs/` is published.
