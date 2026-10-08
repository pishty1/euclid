# Euclid

Euclid is a creative coding playground built with ClojureScript and Quil (Processing). It allows you to create, organize, and showcase generative art sketches in a single web application.

## 🚀 Getting Started

### Prerequisites
- **Node.js** (for `shadow-cljs`)
- **Java** (JDK 17+ recommended for Quil 4.3+)

### Running Locally
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npx shadow-cljs watch app
    ```
3.  Open your browser at [http://localhost:8083](http://localhost:8083).

The app supports hot-reloading, so changes to your code will appear instantly.

## 🏗 Project Structure

The project uses a **Registry & Manifest** pattern to manage sketches dynamically, with a clean separation between system code and user content.

**System Files** (in `src/`):
*   **`entry.cljs`**: The main entry point. Initializes the app and handles sketch switching logic.
*   **`menu.cljs`**: Renders the navigation menu overlay.
*   **`registry.cljs`**: Central atom storing all loaded sketches' configuration.
*   **`manifest.cljs`**: The "Table of Contents". Requires all sketch namespaces so they're included in the build.
*   **`utils/`**: Shared utility modules (e.g., `vectorop.cljs` for vector math).

**User Content** (in `src/sketches/`):
*   Individual sketch files (e.g., `flow.cljs`, `cross.cljs`, `euclid.cljs`, etc.)
*   Each file is a standalone creative work that registers itself.

## 🎨 How to Add a New Sketch

1.  **Create a file** in `src/sketches/` (e.g., `mysketch.cljs`).
2.  **Define your sketch** using the `registry/def-sketch` helper at the bottom of your file:
    ```clojure
    (ns sketches.mysketch
      (:require [quil.core :as q]
                [registry :as registry]
                [menu :as menu]))

    ;; ... your setup, update, draw functions ...

    (registry/def-sketch "My Sketch Name" '(100 200 255) ;; RGB Color for menu button
      {:host "sketch"
       :setup setup
       :draw draw
       :size [menu/w menu/h]
       :middleware [menu/show-frame-rate]})
    ```
3.  **Register it** by adding the namespace to `src/manifest.cljs`:
    ```clojure
    (ns manifest
      (:require [sketches.mysketch] ;; <-- Add this
                ...))
    ```
4.  Save, and it will automatically appear in the menu!

## 📦 Deployment

Production: **https://pishty.uk/apps/euclid/** (static hosting, separate from WordPress).

### Automated Deployment
Pushing to `main` triggers `.github/workflows/pwork.yaml`, which:
1. Installs locked npm dependencies and builds with Java 17 / `shadow-cljs release prod` on GitHub.
2. Packages an allowlisted static release with a fingerprinted JavaScript asset and commit metadata.
3. Deploys over restricted SSH, atomically switching the server's current release.
4. Checks the public release commit and HTTPS response.

GitHub repository secrets `EUCLID_DEPLOY_KEY` and `EUCLID_KNOWN_HOSTS` are required. The dedicated `euclid-deploy` account cannot execute arbitrary SSH commands or modify WordPress. GitHub Pages publishing is no longer part of the workflow; the old Pages site is left as a historical copy.

Previous releases are retained for rollback. Server configuration, receiver tests, backup records, and rollback instructions live in `~/ws/pishty.uk/docs/euclid-integration.md`. Never deploy this repository into the WordPress document root.

For a manual package after building:
```bash
GITHUB_SHA=$(git rev-parse HEAD) node scripts/package-release.mjs
(cd dist && tar -czf ../release.tar.gz index.html images/fav.png release.json js/main-*.js)
```
Use a clean `dist/` directory for each build (GitHub runners start clean).

### Manual Build
To build for production locally:
```bash
npx shadow-cljs release prod
```
This generates the optimized assets in `docs/`.

## 🔗 Links
[Open Euclid](https://pishty.uk/apps/euclid/) · [Blog Post](https://pishty.uk/euclid/)