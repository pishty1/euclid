(ns menu
  (:require [clojure.string :as str]
            [quil.core :as q]
            [registry :as registry]))

(defonce selected-sketch (atom 0))
(defonce menu-visible (atom false))
(defonce body (.-body js/document))
(defonce w (.-clientWidth body))
(defonce h (.-clientHeight body))

(def descriptions
  {"Prime Gardens" "Prime gaps guide a growing geometric garden."
   "La Cross" "Rotating crosses weave threads and trace intersections."
   "Ad Venture" "Solve arithmetic to blast incoming enemy ships."
   "Figget-A-Balls" "Build your own ecosystem of cell chains, rings, and colonies."
   "Euclid" "Living proofs, compass roses, and draggable geometry."})

(def styles
  "#euclid-nav,#euclid-menu{font-family:system-ui,-apple-system,sans-serif;color:#eee9dd;font-size:14px;box-sizing:border-box}
   #euclid-nav{position:fixed;z-index:20;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));display:flex;align-items:center;gap:12px;padding:11px 15px;border:1px solid #ffffff28;border-radius:12px;background:#101719e8;box-shadow:0 4px 24px #0003;cursor:pointer;touch-action:manipulation;backdrop-filter:blur(12px)}
   #euclid-nav:hover{background:#243335;border-color:#ffffff50}
   #euclid-nav .menu-icon{font-size:20px;line-height:1}
   #euclid-nav .current-name{font-size:12px;color:#adbbb7;border-left:1px solid #ffffff28;padding-left:12px}
   #euclid-nav:focus-visible,#euclid-menu button:focus-visible{outline:2px solid #edc778;outline-offset:4px}
   #euclid-menu{width:min(460px,calc(100vw - 24px));max-height:calc(100dvh - 32px);padding:0;border:1px solid #ffffff26;border-radius:20px;background:#121b1d;box-shadow:0 24px 100px #0009;overflow:auto;overscroll-behavior:contain}
   #euclid-menu::backdrop{background:#030909b8;backdrop-filter:blur(6px)}
   #euclid-menu .menu-shell{padding:24px}
   #euclid-menu .menu-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:22px}
   #euclid-menu .eyebrow{font-size:10px;letter-spacing:.22em;color:#a3b7b3;margin:0 0 8px}
   #euclid-menu h2{font-size:26px;font-weight:500;letter-spacing:-.04em;margin:0}
   #euclid-menu .intro{color:#9caeaa;font-size:12px;margin:8px 0 0;line-height:1.5}
   #euclid-menu button{font:inherit;touch-action:manipulation}
   #euclid-menu .close-menu{width:36px;height:36px;flex-shrink:0;border:1px solid #ffffff25;border-radius:50%;color:#eee9dd;background:transparent;font-size:22px;cursor:pointer}
   #euclid-menu .close-menu:hover{background:#ffffff10}
   #euclid-menu .sketch-list{display:grid;gap:8px}
   #euclid-menu .sketch-card{display:flex;align-items:center;gap:14px;width:100%;text-align:left;border:1px solid #ffffff14;border-radius:12px;background:#ffffff03;padding:16px;color:#eee9dd;cursor:pointer}
   #euclid-menu .sketch-card:hover{background:#ffffff08;border-color:#ffffff35}
   #euclid-menu .sketch-card[aria-current=true]{background:#a9c3b312;border-color:#9bb8a763}
   #euclid-menu .swatch{width:10px;height:34px;flex-shrink:0;border-radius:6px;background:var(--accent);box-shadow:0 0 18px color-mix(in srgb,var(--accent) 25%,transparent)}
   #euclid-menu .card-copy{flex:1;min-width:0}
   #euclid-menu .card-title{display:block;font-size:14px;font-weight:500;margin-bottom:5px}
   #euclid-menu .card-description{display:block;color:#9caeaa;font-size:11px;line-height:1.5}
   #euclid-menu .card-status{color:#d5c295;font-size:11px;flex-shrink:0}
   #euclid-menu .menu-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px;padding-top:18px;border-top:1px solid #ffffff14}
   #euclid-menu .restart-sketch{padding:9px 12px;border-radius:8px;border:1px solid #ffffff25;background:transparent;color:#eee9dd;cursor:pointer;font-size:12px}
   #euclid-menu .restart-sketch:hover{background:#ffffff0c}
   #euclid-menu .hint{font-size:10px;color:#899c96}
   @media(max-width:400px){#euclid-nav .current-name{display:none}#euclid-menu .menu-shell{padding:18px}#euclid-menu .sketch-card{padding:13px;gap:10px}}
   @media(prefers-reduced-motion:no-preference){#euclid-menu[open]{animation:euclid-menu-in .16s ease-out}@keyframes euclid-menu-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}}")

(defn element [tag class-name text]
  (let [node (.createElement js/document tag)]
    (set! (.-className node) class-name)
    (when text (set! (.-textContent node) text))
    node))

(defn close-menu! []
  (when-let [dialog (.getElementById js/document "euclid-menu")]
    (.close dialog))
  (reset! menu-visible false)
  (when-let [button (.getElementById js/document "euclid-nav")]
    (.setAttribute button "aria-expanded" "false")
    (.focus button)))

(defn choose-sketch! [index]
  (close-menu!)
  ;; Resetting the same index deliberately restarts the current sketch.
  (reset! selected-sketch index))

(defn focus-card! [index]
  (let [cards (.querySelectorAll js/document "#euclid-menu .sketch-card")]
    (when (pos? (.-length cards))
      (.focus (.item cards (mod index (.-length cards)))))))

(defn refresh-menu! []
  (when-let [list (.getElementById js/document "euclid-sketch-list")]
    (set! (.-textContent list) "")
    (doseq [[index sketch] (registry/get-all-sketches)]
      (let [active? (= index @selected-sketch)
            card (element "button" "sketch-card" nil)
            swatch (element "span" "swatch" nil)
            copy (element "span" "card-copy" nil)]
        (set! (.-type card) "button")
        (.setAttribute card "aria-current" (str active?))
        (.setAttribute swatch "aria-hidden" "true")
        (.setProperty (.-style swatch) "--accent" (str "rgb(" (str/join "," (:color sketch)) ")"))
        (.appendChild copy (element "span" "card-title" (:name sketch)))
        (.appendChild copy (element "span" "card-description"
                                    (get descriptions (:name sketch) "An interactive generative sketch.")))
        (.appendChild card swatch)
        (.appendChild card copy)
        (.appendChild card (element "span" "card-status" (if active? "Active" "→")))
        (.addEventListener card "click" (fn [_] (choose-sketch! index)))
        (.addEventListener card "keydown"
                          (fn [event]
                            (let [target (case (.-key event)
                                           "ArrowDown" (inc index)
                                           "ArrowUp" (dec index)
                                           "Home" 0
                                           "End" (dec (count (registry/get-all-sketches)))
                                           nil)]
                              (when (some? target)
                                (.preventDefault event)
                                (focus-card! target)))))
        (.appendChild list card))))
  (when-let [button (.getElementById js/document "euclid-nav")]
    (.setAttribute button "data-sketch" (:name (registry/get-sketch @selected-sketch)))
    (.setAttribute body "data-sketch" (:name (registry/get-sketch @selected-sketch))))
  (when-let [name-node (.querySelector js/document "#euclid-nav .current-name")]
    (set! (.-textContent name-node) (:name (registry/get-sketch @selected-sketch)))))

(defn open-menu! []
  (refresh-menu!)
  (when-let [dialog (.getElementById js/document "euclid-menu")]
    (.showModal dialog)
    (reset! menu-visible true)
    (.setAttribute (.getElementById js/document "euclid-nav") "aria-expanded" "true")
    (focus-card! @selected-sketch)))

(defn init-ui! []
  (when-not (.getElementById js/document "euclid-menu-styles")
    (let [style (element "style" "" styles)]
      (set! (.-id style) "euclid-menu-styles")
      (.appendChild (.-head js/document) style)))
  (when-not (.getElementById js/document "euclid-nav")
    (let [button (element "button" "" nil)]
      (set! (.-id button) "euclid-nav")
      (set! (.-type button) "button")
      (.setAttribute button "aria-haspopup" "dialog")
      (.setAttribute button "aria-controls" "euclid-menu")
      (.setAttribute button "aria-expanded" "false")
      (.appendChild button (element "span" "menu-icon" "☰"))
      (.appendChild button (element "span" "" "Sketches"))
      (.appendChild button (element "span" "current-name" nil))
      (.addEventListener button "click" (fn [event] (.stopPropagation event) (open-menu!)))
      (doseq [event-name ["mousedown" "mouseup" "touchstart" "touchend"]]
        (.addEventListener button event-name (fn [event] (.stopPropagation event))))
      (.appendChild body button)))
  (when-not (.getElementById js/document "euclid-menu")
    (let [dialog (element "dialog" "" nil)
          shell (element "div" "menu-shell" nil)
          heading (element "div" "menu-heading" nil)
          title-group (element "div" "" nil)
          title (element "h2" "" "Choose a sketch")
          close (element "button" "close-menu" "×")
          list (element "div" "sketch-list" nil)
          footer (element "div" "menu-footer" nil)
          restart (element "button" "restart-sketch" "Restart sketch")]
      (set! (.-id dialog) "euclid-menu")
      (set! (.-id title) "euclid-menu-title")
      (set! (.-id list) "euclid-sketch-list")
      (.setAttribute dialog "aria-labelledby" "euclid-menu-title")
      (.setAttribute close "aria-label" "Close sketch menu")
      (set! (.-type close) "button")
      (set! (.-type restart) "button")
      (.appendChild title-group (element "p" "eyebrow" "EUCLID / PLAYGROUND"))
      (.appendChild title-group title)
      (.appendChild title-group (element "p" "intro" "Explore geometry, motion, and small experiments."))
      (.appendChild heading title-group)
      (.appendChild heading close)
      (.appendChild footer restart)
      (.appendChild footer (element "span" "hint" "↑ ↓ to browse · Esc to close"))
      (doseq [node [heading list footer]] (.appendChild shell node))
      (.appendChild dialog shell)
      (.addEventListener close "click" (fn [_] (close-menu!)))
      (.addEventListener restart "click" (fn [_] (choose-sketch! @selected-sketch)))
      (.addEventListener dialog "cancel" (fn [event] (.preventDefault event) (close-menu!)))
      (.addEventListener dialog "click"
                        (fn [event]
                          (when (identical? (.-target event) dialog) (close-menu!))
                          (.stopPropagation event)))
      ;; Keep pointer and keyboard input in the dialog out of the canvas handlers.
      (doseq [event-name ["mousedown" "mouseup" "mousemove" "touchstart" "touchend" "touchmove" "keydown" "keyup"]]
        (.addEventListener dialog event-name (fn [event] (.stopPropagation event))))
      (.appendChild body dialog)))
  (refresh-menu!))

(defn inside-burger? []
  ;; Compatibility for sketches that reserve the navigation button's area.
  (when-let [button (.getElementById js/document "euclid-nav")]
    (let [rect (.getBoundingClientRect button)]
      (and (<= (.-left rect) (q/mouse-x) (.-right rect))
           (<= (.-top rect) (q/mouse-y) (.-bottom rect))))))

(defn when-mouse-pressed [state]
  (assoc state :mouse-pressed-position [(q/mouse-x) (q/mouse-y)]))

(defn wrap-setup [options]
  (let [setup (:setup options (fn [] {}))]
    (assoc options :setup
           (fn []
             (init-ui!)
             (reset! (q/state-atom)
                     (assoc (setup) :menu-visible? @menu-visible :w w :h h))))))

(defn wrap-draw [options]
  (let [draw (:draw options (fn [] nil))]
    (-> options
        (dissoc :update)
        (assoc :draw
               (fn []
                 (swap! (q/state-atom) assoc :menu-visible? @menu-visible)
                 (draw))))))

;; Historical middleware name retained for all existing sketches.
(defn show-frame-rate [options]
  (-> options wrap-setup wrap-draw))
