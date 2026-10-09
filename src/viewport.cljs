(ns viewport)

(defn standalone? []
  (or (true? (.-standalone (.-navigator js/window)))
      (.-matches (.matchMedia js/window "(display-mode: standalone)"))
      (.-matches (.matchMedia js/window "(display-mode: fullscreen)"))))

(defn canvas-height []
  ;; Home Screen Safari can report a layout viewport shorter than its screen.
  ;; Fit the actual drawing surface; do not constrain it to body/innerHeight.
  (let [host (.getElementById js/document "sketch")
        screen (.-screen js/window)
        screen-height (if (> (.-innerWidth js/window) (.-innerHeight js/window))
                        (min (.-width screen) (.-height screen))
                        (max (.-width screen) (.-height screen)))
        minimum (if (standalone?) (max (.-innerHeight js/window) screen-height)
                    (.-innerHeight js/window))]
    (when host
      (let [value (str minimum "px")]
        (when (not= value (.. host -style -minHeight))
          (set! (.. host -style -minHeight) value))))
    (js/Math.ceil (max minimum (if host (.-height (.getBoundingClientRect host)) 0)
                       (if host (.-clientHeight host) 0)))))

(def backgrounds
  {"Prime Gardens" "#101719" "La Cross" "#091018"
   "Add Venture" "#040d14" "Figget-A-Balls" "#062442" "Euclid" "#080f17"})

(defn match-background! [name]
  ;; Safari may paint the home-indicator region from the document background.
  (let [color (get backgrounds name "#040d14")]
    (set! (.. js/document -documentElement -style -backgroundColor) color)
    (set! (.. js/document -body -style -backgroundColor) color)
    (when-let [theme (.querySelector js/document "meta[name='theme-color']")]
      (.setAttribute theme "content" color))))
