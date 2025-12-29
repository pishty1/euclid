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

The project uses a **Registry & Manifest** pattern to manage sketches dynamically.

*   **`src/sketches/entry.cljs`**: The main entry point. It initializes the app and handles the sketch switching logic.
*   **`src/sketches/menu.cljs`**: Renders the navigation menu overlay.
*   **`src/sketches/registry.cljs`**: A central atom that stores the configuration of all loaded sketches.
*   **`src/sketches/manifest.cljs`**: The "Table of Contents". This file requires all the sketch namespaces so they are included in the build.
*   **`src/sketches/repo/`**: The folder where your individual sketch files live.

## 🎨 How to Add a New Sketch

1.  **Create a file** in `src/sketches/repo/` (e.g., `mysketch.cljs`).
2.  **Define your sketch** using the `registry/def-sketch` helper at the bottom of your file:
    ```clojure
    (ns sketches.repo.mysketch
      (:require [quil.core :as q]
                [sketches.registry :as registry]
                [sketches.menu :as menu]))

    ;; ... your setup, update, draw functions ...

    (registry/def-sketch "My Sketch Name" '(100 200 255) ;; RGB Color for menu button
      {:host "sketch"
       :setup setup
       :draw draw
       :size [menu/w menu/h]
       :middleware [menu/show-frame-rate]})
    ```
3.  **Register it** by adding the namespace to `src/sketches/manifest.cljs`:
    ```clojure
    (ns sketches.manifest
      (:require [sketches.repo.mysketch] ;; <-- Add this
                ...))
    ```
4.  Save, and it will automatically appear in the menu!

## 📦 Deployment

The project is configured to deploy to GitHub Pages.
To build for production:
```bash
npx shadow-cljs release prod
```
This generates the optimized assets in `docs/`, which GitHub Pages can serve.

## 🔗 Links
[Blog Post](https://pishty.uk/euclid/)