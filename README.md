# SHUSHU/TONG × SHINING NIKKI — LIVE Photo Booth

## Latest update: FULL LIVE CAMERA preview (Photoism-style)

The camera image now fills the **entire square photo**. The three virtual characters are separate PNGs with transparent backgrounds, composited **over** the live camera view. You can adjust virtual character size and left/right position. This is a visual composite, not a real-time 3D AR tracking system.

Photos: **Pink → Blue → Silver**, with a 3-second countdown per photo. The result uses your pink frame's original order: **Pink → Silver → Blue**. Download the resulting strip as a PNG. No API key or backend required.

## How to update your existing GitHub Pages website

1. Unzip the updated project ZIP locally.
2. Open your existing repository `virtual-photo-booth` on GitHub.
3. Choose **Add file → Upload files** and upload `index.html`, `app.js`, `styles.css`, `README.md`, and the complete `assets` folder contents. **Replace** the same-named files in the existing repository. You can also edit or commit changes using Git on your computer.
4. Make sure the following are all in the **repository root** (not inside an extra nested folder): `index.html`, `app.js`, `styles.css`, and folder `assets/`.
5. Commit changes. Since GitHub Pages is already configured, it will publish updates automatically after the new commit finishes deploying.
6. Refresh the GitHub Pages website with **Ctrl + Shift + R** (or use a private/incognito window) to bypass cached old files.

Expected website address based on your repo:
https://l61983552-glitch.github.io/virtual-photo-booth/

## Files
- `index.html` Main Page / Shooting Page / Final Photo Strip
- `styles.css` Responsive styling and adjustable photo booth controls
- `app.js` In-browser camera, composition, auto 3-shot sequence, saving PNG
- `assets/home.jpg` Your original homepage artwork
- `assets/scene-{pink,blue,silver}.jpg` Your original virtual character scenes, preserved unchanged
- `assets/character-{pink,blue,silver}.png` Derived cutouts of your supplied virtual character designs for full-camera overlay
- `assets/frame.jpg` Your original pink 3-cut frame, preserved unchanged

## Camera notes

- Webcam permission requires HTTPS (provided automatically by GitHub Pages) or localhost.
- Stand further from the camera to fit more of your body into view. The website cannot enlarge the physical camera's field of view.
- If camera access fails, use **OR UPLOAD A SELFIE**. No images are uploaded to a server; they stay in the browser.
- Camera images are mirrored for a mirror-like live preview; uploaded selfies are left as supplied.
- This works with static character photographs. It does not make the virtual character move or change pose during capture.
- The PNG cutout edges are approximate because the originals have blue skies and green hills behind the characters. For perfect hair strands, replace the three `character-*.png` files with manually masked transparent exports using the same names.
