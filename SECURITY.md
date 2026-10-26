# Security policy

## Supported versions

Only the latest release of Dockbar gets security fixes. Update through HACS to stay current.

## Reporting a vulnerability

Please report security problems privately, not in a public issue.

Use GitHub's private reporting: go to the [Security tab](https://github.com/aistuartai/Dockbar/security) and choose **Report a vulnerability**, or open [a new advisory](https://github.com/aistuartai/Dockbar/security/advisories/new) directly.

Please include:

- What you found and why it matters.
- The Dockbar and Home Assistant versions, and the browser or app.
- Steps to reproduce it, or a proof of concept.

Dockbar is maintained by one person, so I can't promise fixed response times. I'll acknowledge a report as soon as I can, keep you updated, and credit you in the release notes if you'd like.

## What counts

Dockbar runs JavaScript in Home Assistant's own page, so these are the kinds of problems I'm most interested in:

- Script or HTML injection through a button name, icon, link, entity value or any other setting.
- A link or action that runs code or navigates somewhere unintended (for example a `javascript:` URL).
- One user's or device's settings affecting, or exposing data to, another.
- Anything that lets a non-admin change what Everyone sees, or read data they shouldn't.
- Problems in the release or CI process that could ship a tampered build.

## What doesn't

- **Custom CSS and shadow strings** are trusted input. An admin (at the Everyone level), or you (at Just me or This device), can already change how the bar looks, and CSS can make requests to other sites by design.
- **`/config/www/dockbar/config.yaml`** is served by Home Assistant at `/local/` without authentication. That's how Home Assistant serves the `www` folder, and the README warns against putting secrets there.
- Issues in Home Assistant itself, or in HACS. Please report those to their projects.

## How Dockbar handles this

- Button links are limited to `http:`, `https:`, `mailto:` and `tel:`, and checked again when clicked.
- Saved settings are validated when they're read, and anything invalid is dropped.
- Settings live in Home Assistant's own frontend storage. Dockbar doesn't collect or send data anywhere.
- Releases are built by GitHub Actions from a tag, and the workflow fails if the tag doesn't match the version files.
