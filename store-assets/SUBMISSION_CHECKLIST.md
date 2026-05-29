# Chrome Web Store Submission Checklist

Complete these steps in order to publish Yomi-Subs v2 to the Chrome Web Store.

---

## Step 1 — Developer account (one-time, ~5 min)

1. Go to <https://chrome.google.com/webstore/devconsole>
2. Sign in with a Google account
3. Pay the **one-time $5 USD registration fee**
4. Agree to the Developer Agreement

---

## Step 2 — Prepare the extension ZIP

Run this from the project root (or use the pre-built `extension-v2.zip`):

```bash
cd yomi-subs-v2
zip -r extension-v2.zip yomi-subs-extension/ --exclude "*.DS_Store"
```

Verify the ZIP:
- [ ] Contains `manifest.json` at the root of the ZIP (not inside a subfolder)
- [ ] All icon files present at `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, `icons/icon128.png`
- [ ] No `.env` files or API keys inside
- [ ] Does **not** contain the `venv/` folder or `node_modules/`

---

## Step 3 — Prepare store assets

- [ ] **Icons** — Replace placeholder icons in `store-assets/icons/` with final artwork:
  - `icon16.png` — 16×16 px
  - `icon32.png` — 32×32 px
  - `icon48.png` — 48×48 px
  - `icon128.png` — 128×128 px (used as the store tile)
  
- [ ] **Screenshots** — Chrome Web Store requires at least 1 screenshot (1280×800 or 640×400 px):
  - Recommended: show the subtitle overlay on a video, and the popup UI
  - Save as PNG or JPEG

- [ ] **Promotional tile** (optional but recommended):
  - Small: 440×280 px
  - Large: 920×680 px

---

## Step 4 — Create a new item in the Developer Dashboard

1. Go to <https://chrome.google.com/webstore/devconsole>
2. Click **"New item"**
3. Upload `extension-v2.zip`
4. Wait for Chrome's automated review to scan the ZIP (usually instant)

---

## Step 5 — Fill in the store listing

| Field | Value |
|-------|-------|
| Name | Yomi-Subs: Real-Time Japanese Transcription |
| Short description | See `store-assets/store-listing.md` (131 chars) |
| Detailed description | See `store-assets/store-listing.md` |
| Category | Productivity |
| Language | English |
| Screenshots | Upload at least 1 (see Step 3) |
| Icon (store tile) | Upload `store-assets/icons/icon128.png` |

---

## Step 6 — Privacy practices

1. In the dashboard, go to **Privacy practices**
2. Answer all questions:
   - **Remote code?** → No
   - **Data collection?** → Yes (tab audio in OpenAI mode, API key in storage)
   - Fill in the data table matching `store-listing.md` §Privacy practices
3. Enter your privacy policy URL — host `store-assets/privacy-policy.html` on:
   - GitHub Pages: `https://YOUR_GITHUB_USERNAME.github.io/yomi-subs/privacy-policy.html`
   - Or any public URL

---

## Step 7 — Visibility & distribution

- **Visibility**: Public (or Unlisted for beta testing)
- **Distribution**: All regions, or restrict to specific countries
- **Payments**: Free

---

## Step 8 — Submit for review

1. Click **"Submit for review"**
2. Google typically reviews within **1–3 business days** for new extensions
3. You will receive an email when approved or if changes are requested

---

## Step 9 — After approval

- [ ] Add the Chrome Web Store badge to your `README.md`
- [ ] Update the installation instructions with the store link
- [ ] Tag the GitHub release: `git tag v2.0.0 && git push --tags`

---

## Manifest V3 validation checklist

Before submitting, verify `yomi-subs-extension/manifest.json` has:

- [x] `"manifest_version": 3`
- [x] `"name"` — present
- [x] `"version"` — present (semver string)
- [x] `"description"` — present (≤ 132 chars)
- [x] `"icons"` — all 4 sizes present
- [x] `"background"` uses `"service_worker"` (not `"scripts"`)
- [x] `"content_security_policy"` — `"extension_pages"` key present
- [x] No `"background.persistent": true` (MV2 only)
- [x] No inline scripts in HTML files
- [x] No remote code execution (`eval`, `new Function`, remote `<script>` tags)
- [x] `"host_permissions"` separate from `"permissions"` (MV3 requirement)
- [x] `"action"` key present (replaces `"browser_action"` / `"page_action"`)

---

## Common rejection reasons to avoid

| Issue | How to avoid |
|-------|-------------|
| Overly broad permissions | Our permissions are all justified — document them |
| Missing privacy policy | Host the `privacy-policy.html` before submitting |
| Unclear description | Use the description from `store-listing.md` |
| Icons missing or wrong size | Double-check all 4 sizes are correct PNGs |
| Remote code | We have none — CSP enforces this |
| Hardcoded API keys | We have none — always use `chrome.storage` |
