# SHUSHU/TONG × SHINING NIKKI – Three-Cut Photo Booth

A single-page website made from **your exact uploaded designs**. No AI regeneration, no backend, no API key, and no build process.

## Flow

1. Homepage uses your `download(5).jpg` art as-is. Tap the existing pink **START** button.
2. Take **three photos**, each with a different character/background: pink, blue, then silver. Each shot uses a **3-second countdown**.
3. View and **download a PNG three-cut strip**, composited into your original frame (`download(7).jpg`). The original frame places the characters **pink / silver / blue** from top to bottom.

The site uses the original character photos; it crops the blank white top/bottom margins to create square scenes. It does not change the character's face, outfit, or background. A browser webcam is shown on the empty side of each virtual character scene. Where internet access and browser support allow, MediaPipe's in-browser selfie segmentation removes the webcam background. Otherwise it falls back to a softly blended side view. If camera access is denied, **OR UPLOAD A SELFIE** supports testing with a local photo.

**Important:** The automatic background cutout downloads MediaPipe JavaScript/model assets from jsDelivr when online. No personal photo is uploaded to our server. Browser processing and photo export are local. The split/blend fallback works without MediaPipe. Results are not automatically stored between sessions.

## Upload to GitHub Pages (no coding needed)

1. Sign in to GitHub and open https://github.com/new.
2. Create a **public** repository, e.g. `shushu-nikki-photobooth`.
3. Upload **`index.html`, `app.js`, `styles.css`, and the entire `assets` folder** into the root of the repository (keep asset folder paths unchanged). Commit changes.
4. Go to **Settings → Pages**; set **Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**; click **Save**.
5. Open `https://YOUR-GITHUB-USERNAME.github.io/shushu-nikki-photobooth/` after Pages deployment completes.
6. Open via **HTTPS**. Camera permissions normally require HTTPS (or `localhost`) and may not work from an opened local `file:///...` path.

## Testing locally

Run `python -m http.server 8000` inside this folder, and open http://localhost:8000. On desktop use a camera or select **OR UPLOAD A SELFIE**. On mobile open the published GitHub Pages HTTPS link.

## Project files

- `index.html` — homepage and photo booth/result screens
- `styles.css` — layout for phone/desktop
- `app.js` — camera, optional background segmentation, 3-photo countdown, PNG exporter
- `assets/home.jpg` — original homepage
- `assets/scene-pink.jpg`, `assets/scene-blue.jpg`, `assets/scene-silver.jpg` — cropped from three uploaded references
- `assets/frame.jpg` — the original narrow pink three-cut photo strip (preserves the bow/pearls/logos)

## Notes

This is a fan / student campaign prototype. To publish branded assets publicly, verify any applicable permissions for SHUSHU/TONG and SHINING NIKKI names and artwork. It is not an official website operated by either brand.
