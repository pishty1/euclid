(ns sketches.cross
  (:require [quil.core :as q]
            [menu :as menu]
            [registry :as registry]
            [quil.middleware :as m]
            ["../rendering/cross_gpu.js" :as gpu]))

(def palette
  {:background [9 16 24] :first [239 186 139]
   :second [124 218 220] :trace [234 226 198]})

(defn clamp [value low high] (max low (min high value)))

(defn cross-endpoints [{:keys [x y angle size]}]
  (mapv (fn [i]
          (let [a (+ angle (/ Math/PI 4) (* i (/ Math/PI 2)))]
            [(+ x (* size (Math/cos a))) (+ y (* size (Math/sin a)))]))
        (range 4)))

(defn segment-intersection [[[ax ay] [bx by]] [[cx cy] [dx dy]]]
  (let [rx (- bx ax) ry (- by ay) sx (- dx cx) sy (- dy cy)
        det (- (* rx sy) (* ry sx))]
    (when (> (Math/abs det) 0.00001)
      (let [qx (- cx ax) qy (- cy ay)
            t (/ (- (* qx sy) (* qy sx)) det)
            u (/ (- (* qx ry) (* qy rx)) det)]
        (when (and (<= 0 t 1) (<= 0 u 1))
          [(+ ax (* t rx)) (+ ay (* t ry))])))))

(defn arms [endpoints]
  [[(nth endpoints 0) (nth endpoints 2)] [(nth endpoints 1) (nth endpoints 3)]])

(defn geometry [width height phase separation]
  (let [scale (min width height)
        cx (/ width 2) cy (/ height 2)
        spread (* scale separation)
        sway (* 0.075 scale (Math/sin (* phase 0.43)))
        size (* scale 0.25)]
    {:first {:x (- cx spread) :y (+ cy sway) :angle phase :size size}
     :second {:x (+ cx spread) :y (- cy sway)
              :angle (+ (/ Math/PI 2) (* phase -1.37)) :size size}}))

(defn setup []
  (q/frame-rate 60)
  (when-let [host (.getElementById js/document "sketch")]
    (set! (.-tabIndex host) 0)
    (.focus host))
  (let [overlay (.querySelector js/document "#sketch canvas:not([data-cross-gpu])")]
    {:phase 0 :speed 0.009 :separation 0.13 :traces [] :mode :interactions :paused? false
     :ctx (when overlay (.getContext overlay "2d"))
     :gpu (when overlay (gpu/create (.getElementById js/document "sketch") overlay))
     :geometry (geometry (q/width) (q/height) 0 0.13) :dimensions [(q/width) (q/height)]}))

(defn update-state [state]
  (when (or (not= (q/width) (.-innerWidth js/window))
            (not= (q/height) (.-innerHeight js/window)))
    (q/resize-sketch (.-innerWidth js/window) (.-innerHeight js/window)))
  (let [dims [(q/width) (q/height)]
        state (if (= dims (:dimensions state)) state
                  (assoc state :dimensions dims :traces []
                         :geometry (geometry (first dims) (second dims) (:phase state) (:separation state))))]
    (if (or (:paused? state) (:menu-visible? state)) state
      (let [pointer? (and (pos? (q/mouse-x)) (pos? (q/mouse-y)))
            target-spacing (if pointer? (+ 0.035 (* 0.22 (clamp (/ (q/mouse-x) (q/width)) 0 1))) 0.13)
            target-speed (if pointer? (+ 0.004 (* 0.014 (clamp (/ (q/mouse-y) (q/height)) 0 1))) 0.009)
            spacing (+ (:separation state) (* 0.025 (- target-spacing (:separation state))))
            speed (+ (:speed state) (* 0.025 (- target-speed (:speed state))))
            phase (+ (:phase state) speed)
            shapes (geometry (q/width) (q/height) phase spacing)
            a (cross-endpoints (:first shapes)) b (cross-endpoints (:second shapes))
            intersections (keep identity (for [sa (arms a) sb (arms b)] (segment-intersection sa sb)))]
        (assoc state :phase phase :speed speed :separation spacing :geometry shapes
               :traces (vec (take-last 1200 (concat (:traces state) intersections))))))))

(defn draw-line [[ax ay] [bx by]] (q/line ax ay bx by))

(defn draw-cross [shape color]
  (let [points (cross-endpoints shape)]
    (q/stroke-weight 1.2)
    (apply q/stroke (conj color 220))
    (doseq [[a b] (arms points)] (draw-line a b))
    (q/no-stroke)
    (doseq [[x y] points]
      (apply q/fill (conj color 16))
      (q/ellipse x y 18 18)
      (apply q/fill color)
      (q/ellipse x y 4 4))
    (q/no-fill)
    (apply q/stroke (conj color 95))
    (q/stroke-weight 1)
    (q/ellipse (:x shape) (:y shape) 10 10)))

(defn draw-canvas [{:keys [geometry traces mode phase]}]
  (apply q/background (:background palette))
  (q/rect-mode :corner)
  (q/ellipse-mode :center)
  (let [a (cross-endpoints (:first geometry)) b (cross-endpoints (:second geometry))
        cx (/ (q/width) 2) cy (/ (q/height) 2) radius (* 0.32 (min (q/width) (q/height)))]
    (q/no-fill)
    (q/stroke-weight 1)
    (q/stroke 105 133 153 20)
    (when (not= mode :interactions)
      (q/ellipse cx cy (* 2 radius) (* 2 radius)))
    (when (contains? #{:both :weave} mode)
      (doseq [i (range 4) j (range 4)]
        (apply q/stroke (conj (if (even? (+ i j)) (:first palette) (:second palette)) 42))
        (draw-line (nth a i) (nth b j))))
    (when (contains? #{:both :traces :interactions} mode)
      (q/no-stroke)
      (doseq [[index [x y]] (map-indexed vector traces)]
        (let [alpha (+ 12 (* 95 (/ index (max 1 (count traces)))))]
          (apply q/fill (conj (if (even? index) (:first palette) (:second palette)) (* alpha 0.1)))
          (q/ellipse x y 7 7)
          (apply q/fill (conj (:trace palette) alpha))
          (q/ellipse x y 1.8 1.8))))
    (when (not= mode :interactions)
      (draw-cross (:first geometry) (:first palette))
      (draw-cross (:second geometry) (:second palette)))
    (q/no-stroke)
    (doseq [[index [sa sb]] (map-indexed vector (for [sa (arms a) sb (arms b)] [sa sb]))]
      (when-let [[x y] (segment-intersection sa sb)]
        (let [pulse (+ 0.5 (* 0.5 (Math/sin (+ (* phase 3) (* index 1.7)))))
              color (if (even? index) (:second palette) (:first palette))]
          (doseq [[diameter alpha] [[48 5] [28 12] [14 30]]]
            (apply q/fill (conj color (+ alpha (* pulse 5))))
            (q/ellipse x y diameter diameter))
          (q/no-fill) (q/stroke-weight 0.8)
          (apply q/stroke (conj color (+ 30 (* 30 pulse))))
          (let [diameter (+ 18 (* pulse 10))] (q/ellipse x y diameter diameter))
          (apply q/stroke (conj (:trace palette) 75))
          (q/line (- x 7) y (+ x 7) y) (q/line x (- y 7) x (+ y 7))
          (q/no-stroke) (apply q/fill (:trace palette))
          (q/ellipse x y 4 4))))))

(defn draw-hud [{:keys [mode paused? gpu]}]
  (q/no-stroke)
  (q/text-font "monospace")
  (q/text-align :left :bottom)
  (q/text-size 11)
  (q/fill 183 196 202)
  (q/text "LA CROSS / KINETIC LOOM" 22 (- (q/height) 56))
  (q/text-size 10)
  (q/fill 103 131 148)
  (q/text "Move to shape · Tap / click to change view" 22 (- (q/height) 37))
  (q/text "Space pauses · R resets" 22 (- (q/height) 20))
  (q/text-align :right :top)
  (q/text (str (case mode :both "WEAVE + TRACES" :weave "WEAVE" :traces "TRACES"
                         :interactions "INTERSECTIONS + TRAILS ONLY")
               (when paused? " / PAUSED")) (- (q/width) 22) 76)
  (q/text (gpu/status gpu) (- (q/width) 22) 92))

(defn draw-state [{:keys [geometry traces mode phase ctx gpu] :as state}]
  (let [endpoints (concat (cross-endpoints (:first geometry)) (cross-endpoints (:second geometry)))
        mode-id ({:interactions 0 :traces 1 :weave 2 :both 3} mode)]
    (if (and ctx (gpu/draw gpu (q/width) (q/height) phase mode-id
                          (into-array (map into-array endpoints)) (into-array (map into-array traces))))
      (.clearRect ctx 0 0 (q/width) (q/height))
      (draw-canvas state)))
  (draw-hud state))

(defn mouse-clicked [state]
  (if (:menu-visible? state) state
      (update state :mode {:both :interactions :interactions :traces :traces :weave :weave :both})))

(defn key-pressed [state event]
  (if (:menu-visible? state) state
    (case (:key event)
      :space (update state :paused? not)
      :r (merge state (setup))
      state)))

(registry/def-sketch "La Cross" '(239 186 139)
  {:host "sketch" :title "Kinetic loom" :setup setup :update update-state :draw draw-state
   :mouse-clicked mouse-clicked :key-pressed key-pressed :size [menu/w menu/h]
   :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
