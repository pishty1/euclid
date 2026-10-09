(ns viewport)

(defn canvas-height []
  ;; The host uses 100lvh so art continues behind translucent browser chrome.
  ;; Interactive controls stay in the visible viewport (window.innerHeight).
  (let [host (.getElementById js/document "sketch")]
    (max (.-innerHeight js/window) (if host (.-clientHeight host) 0))))

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
