(ns sketches.figget
  (:require [quil.core :as q] [menu :as menu] [registry :as registry]
            [quil.middleware :as m] [sketches.ecosystem-builder :as builder] [sketches.cell-world :as cells]))

;; Cellular patterns inspired by ALIEN: https://github.com/chrxh/alien
(defonce actions (atom []))

(def control-css
  "body[data-sketch='Figget-A-Balls'] #sketch canvas{display:block;max-width:100vw;max-height:100vh}#figget-controls{display:none;position:fixed;bottom:18px;right:18px;z-index:15;gap:6px}body[data-sketch='Figget-A-Balls'] #figget-controls{display:flex}#figget-controls button{background:#10242deb;border:1px solid #76cab14d;color:#bde8db;border-radius:8px;padding:9px 12px;cursor:pointer;font:12px system-ui;touch-action:manipulation}#figget-controls button:focus-visible{outline:2px solid #eec077}@media(max-width:600px){#figget-controls{bottom:92px;right:14px}}")

(defn init-controls! []
  (when-not (.getElementById js/document "figget-controls")
    (let [panel (menu/element "div" "" nil)]
      (set! (.-id panel) "figget-controls")
      (.appendChild (.-head js/document) (menu/element "style" "" control-css))
      (doseq [[label action] [["Pause" :pause] ["Currents" :currents] ["Reseed" :reset] ["Builder" :builder] ["Done placing" :finish]]]
        (let [button (menu/element "button" "" label)]
          (set! (.-type button) "button")
          (.setAttribute button "data-ecosystem-action" (name action))
          (.addEventListener button "click" (fn [_] (swap! actions conj action)))
          (.addEventListener button "mousedown" (fn [event] (.preventDefault event)))
          (.appendChild panel button)))
      (.appendChild (.-body js/document) panel))))

(defn background-gradient [ctx w h]
  (when ctx
    (let [gradient (.createLinearGradient ctx 0 0 w h)]
      (.addColorStop gradient 0 "#050e25")
      (.addColorStop gradient 1 "#062442")
      gradient)))

(defn setup []
  (init-controls!) (builder/init! #(swap! actions conj %)) (reset! actions [])
  (q/resize-sketch (.-innerWidth js/window) (.-innerHeight js/window))
  (q/frame-rate 60) (q/pixel-density 1)
  (let [w (q/width) h (q/height)
        ctx (some-> (.querySelector js/document "#sketch canvas") (.getContext "2d"))
        target (max 750 (min 4200 (int (/ (* w h) 450))))]
    {:world (cells/populate! (cells/make-world w h) target)
     :auto? true :builder-open? false :placing nil :builder-status "" :colors cells/colors
     :ctx ctx :sprites (when ctx (cells/cell-sprites cells/colors)) :settled-at (+ (.now js/performance) 2000) :gradient (background-gradient ctx w h)
     :tick 0 :paused? false :currents? true :frame-ms 16.67 :last-frame nil
     :healthy 0 :slow 0 :next-probe 0 :ceiling cells/max-cells :tuning "Measuring"}))

(defn add-population [state options count]
  (let [world (:world state)
        added (loop [i 0]
                (if (and (< i count) (cells/add-body! world options)) (recur (inc i)) i))]
    (assoc state :auto? false :tuning "Manual population"
                 :builder-status (if (= added count) (str "Added " added " organisms")
                                     (str "Added " added " — cell capacity reached")))))

(defn apply-action [state action]
  (if (map? action)
    (case (:type action)
      :scatter (add-population state (select-keys action [:kind :scale :drive]) (:count action))
      :place (assoc state :auto? false :placing (select-keys action [:kind :scale :drive])
                          :builder-open? false :tuning "Manual population" :builder-status "Tap the canvas to place organisms")
      :auto (assoc state :auto? (:enabled? action) :last-frame nil :healthy 0 :slow-since nil
                         :next-probe (+ (.now js/performance) 2000))
      :color (let [colors (assoc (:colors state) (:kind action) (:color action))]
               (assoc state :colors colors :sprites (when (:ctx state) (cells/cell-sprites colors))))
      :choose-kind (do (set! (.-value (.getElementById js/document "builder-color"))
                             (nth (:colors state) (:kind action))) state)
      state)
    (case action
      :pause (assoc (update state :paused? not) :last-frame nil)
      :currents (update state :currents? not)
      :builder (if (:builder-open? state) (assoc state :builder-open? false)
                   (assoc state :builder-open? true :auto? false :placing nil :tuning "Manual population"))
      :finish (assoc state :placing nil)
      :empty (let [world (:world state)]
               (aset world "n" 0) (aset world "bn" 0) (aset world "bodies" #js [])
               (assoc state :auto? false :placing nil :tuning "Manual population" :builder-status "Empty ecosystem — scatter or place organisms"))
      :reset (merge state (setup)) state)))

(defn tune-density [state now]
  (let [elapsed (if-let [last (:last-frame state)] (min 1000 (max 1 (- now last))) 16.67)
        average (+ (* (:frame-ms state) 0.94) (* elapsed 0.06))
        healthy (if (< average 18.8) (inc (:healthy state)) 0)
        slow (if (> average 24) (inc (:slow state)) 0)
        slow-since (when (> average 24) (or (:slow-since state) now))
        state (assoc state :frame-ms average :healthy healthy :slow slow :slow-since slow-since :last-frame now)
        world (:world state) n (aget world "n")]
    (cond
      ;; Let shader/canvas initialization and the first paint settle.
      (not (:auto? state)) (assoc state :tuning "Manual population")
      (< now (:settled-at state)) state
      (and slow-since (> (- now slow-since) 1400) (> n 180))
      (let [target (max 150 (int (* n 0.85)))]
        (cells/trim! world target)
        (assoc state :healthy 0 :slow 0 :slow-since nil
                     :next-probe (+ now 8000) :tuning "Balanced"))
      (and (> healthy 90) (>= now (:next-probe state)) (< n (- (:ceiling state) 60)))
      (do (cells/populate! world (min (:ceiling state) (+ n (max 150 (int (* n 0.12))))))
          (assoc state :healthy 0 :next-probe (+ now 2500) :tuning "Increasing density"))
      (or (>= n (- (:ceiling state) 60)) (and (>= now (:next-probe state)) (zero? healthy)))
      (assoc state :tuning "Balanced")
      :else state)))

(defn update-state [state]
  (let [pending @actions _ (reset! actions [])
        state (if (:menu-visible? state) state (reduce apply-action state pending))
        world (:world state) w (.-innerWidth js/window) h (.-innerHeight js/window)
        state (if (or (not= w (aget world "width")) (not= h (aget world "height")))
                (do (q/resize-sketch w h) (cells/resize! world w h)
                    (assoc state :gradient (background-gradient (:ctx state) w h)
                                 :ceiling cells/max-cells :healthy 0 :slow 0 :next-probe 0 :last-frame nil)) state)
        suspended? (or (:menu-visible? state) (:paused? state) (.-hidden js/document))
        state (if suspended? (assoc state :last-frame nil)
                (let [state (tune-density state (.now js/performance))]
                  (cells/step! world (:tick state) (:currents? state))
                  (update state :tick inc)))]
    (when-let [button (.querySelector js/document "[data-ecosystem-action=pause]")]
      (set! (.-textContent button) (if (:paused? state) "Resume" "Pause")))
    (when-let [button (.querySelector js/document "[data-ecosystem-action=currents]")]
      (.setAttribute button "aria-pressed" (str (:currents? state))))
    (when-let [button (.querySelector js/document "[data-ecosystem-action=builder]")]
      (.setAttribute button "aria-expanded" (str (:builder-open? state))))
    (when-let [button (.querySelector js/document "[data-ecosystem-action=finish]")]
      (set! (.-hidden button) (nil? (:placing state))))
    (builder/sync! state)
    state))

(defn draw-state [{:keys [world ctx gradient sprites colors placing paused? frame-ms tuning]}]
  (when ctx (cells/draw! world ctx gradient sprites colors))
  (q/no-stroke) (q/text-font "monospace") (q/text-size 11)
  (q/fill 151 186 202) (q/text-align :right :top)
  (q/text (str (aget world "n") " cells / " (.-length (aget world "bodies")) " organisms") (- (q/width) 20) 76)
  (q/text-size 10) (q/fill 90 131 158)
  (q/text (str (Math/round (/ 1000 frame-ms)) " FPS / " tuning) (- (q/width) 20) 94)
  (q/text-align :left :bottom) (q/text-size 11) (q/fill 151 186 202)
  (q/text "FIGGET-A-BALLS / CELLULAR SEA" 20 (- (q/height) 62))
  (q/text-size 10) (q/fill 90 131 158)
  (q/text "Chains / Rings / Colonies" 20 (- (q/height) 43))
  (q/text (if placing "Tap canvas to place / Esc finishes" "Builder creates ecosystems / R reseeds") 20 (- (q/height) 25))
  (when paused?
    (q/text-align :center :center) (q/text-size 16) (q/fill 204 222 214)
    (q/text "PAUSED" (/ (q/width) 2) (/ (q/height) 2))))

(defn key-pressed [state event]
  (if (or (:menu-visible? state)
          (some-> (.-activeElement js/document) (.closest "#figget-controls,#ecosystem-builder"))) state
    (case (:key event) :escape (assoc state :placing nil :builder-open? false) :space (apply-action state :pause) :c (apply-action state :currents)
          :r (apply-action state :reset) state)))

(defn mouse-clicked [state]
  (let [pending @actions _ (reset! actions [])
        state (if (:menu-visible? state) state (reduce apply-action state pending))
        pos [(q/mouse-x) (q/mouse-y)] now (.now js/performance)
        over-ui? (when (.-elementFromPoint js/document)
                   (some-> (.elementFromPoint js/document (first pos) (second pos))
                           (.closest "#figget-controls,#ecosystem-builder,#euclid-nav,#euclid-menu")))]
    (if (or (:menu-visible? state) (:builder-open? state) (nil? (:placing state))
            (menu/inside-burger?) over-ui?
            (let [[x y] pos] (or (< x 0) (< y 0) (> x (q/width)) (> y (q/height))))
            (and (:last-place state) (< (- now (:time (:last-place state))) 400)
                 (< (js/Math.hypot (- (first pos) (first (:pos (:last-place state))))
                                     (- (second pos) (second (:pos (:last-place state))))) 3)))
      state
      (assoc (add-population state (assoc (:placing state) :location pos) 1)
             :last-place {:pos pos :time now}))))

(registry/def-sketch "Figget-A-Balls" '(86 219 137)
  {:host "sketch" :title "Cellular sea" :setup setup :update update-state :draw draw-state
   :renderer :p2d :key-pressed key-pressed :mouse-clicked mouse-clicked :size [menu/w menu/h]
   :middleware [menu/show-frame-rate m/fun-mode]})
