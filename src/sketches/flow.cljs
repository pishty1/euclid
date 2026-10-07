(ns sketches.flow
  (:require [quil.core :as q :include-macros true]
            [menu :as menu]
            [registry :as registry]
            [quil.middleware :as m]))

(def config
  {:seed 42 :growth-interval 24 :max-points 90 :max-lines 120
   :min-spacing 16 :margin 55})

(def palette
  {:background [16 23 25]
   :construction [102 145 144]
   :chord [190 143 93]
   :point [233 222 192]})

(defn distance-squared [[ax ay] [bx by]]
  (+ (* (- ax bx) (- ax bx)) (* (- ay by) (- ay by))))

(defn inside-garden? [[x y]]
  (let [margin (min (:margin config) (/ menu/w 6) (/ menu/h 6))]
    (and (< margin x (- menu/w margin))
         (< margin y (- menu/h margin)))))

(defn separated? [points p]
  (every? #(> (distance-squared (:pos %) p)
              (* (:min-spacing config) (:min-spacing config))) points))

(defn bisector [[ax ay] [bx by]]
  {:origin [(/ (+ ax bx) 2) (/ (+ ay by) 2)]
   :direction [(- ay by) (- bx ax)]})

(defn intersection [{[ax ay] :origin [dx dy] :direction}
                     {[bx by] :origin [ex ey] :direction}]
  (let [det (- (* dx ey) (* dy ex))]
    (when (> (Math/abs det) 0.0001)
      (let [t (/ (- (* (- bx ax) ey) (* (- by ay) ex)) det)]
        [(+ ax (* t dx)) (+ ay (* t dy))]))))

(defn clipped-endpoints [{[x y] :origin [dx dy] :direction}]
  (let [hits (concat
              (when (> (Math/abs dx) 0.0001)
                (for [edge [0 menu/w]
                      :let [py (+ y (* (/ (- edge x) dx) dy))]
                      :when (<= 0 py menu/h)] [edge py]))
              (when (> (Math/abs dy) 0.0001)
                (for [edge [0 menu/h]
                      :let [px (+ x (* (/ (- edge y) dy) dx))]
                      :when (<= 0 px menu/w)] [px edge])))]
    ;; A corner can occur twice; distinct keeps the visible segment nonzero.
    (vec (take 2 (distinct hits)))))

(defn initial-garden []
  (let [cx (/ menu/w 2) cy (/ menu/h 2)
        radius (* 0.23 (min menu/w menu/h))]
    {:points (mapv (fn [i]
                     (let [angle (+ -0.7 (* i (/ (* 2 Math/PI) 7)))
                           r (* radius (q/random 0.65 1.2))]
                       {:pos [(+ cx (* r (Math/cos angle)))
                              (+ cy (* r (Math/sin angle)))]
                        :born 0 :generation 0})) (range 7))
     :lines [] :pairs #{} :tick 0}))

(defn sketch-setup []
  (q/frame-rate 30)
  (q/random-seed (:seed config))
  (initial-garden))

(defn grow [state]
  (let [points (:points state)
        ;; Prefer new intersections, but allow older branches to keep growing.
        a (if (< (q/random 1) 0.7)
            (max 0 (- (count points) 1 (int (q/random (min 8 (count points))))))
            (int (q/random (count points))))
        b (int (q/random (count points)))
        pair (vec (sort [a b]))
        pa (:pos (nth points a)) pb (:pos (nth points b))]
    (if (or (= a b) (contains? (:pairs state) pair)
            (< (distance-squared pa pb) 900)
            (>= (count (:lines state)) (:max-lines config)))
      state
      (let [line (assoc (bisector pa pb)
                        :parents [pa pb] :born (:tick state)
                        :generation (inc (max (:generation (nth points a))
                                              (:generation (nth points b)))))
            candidates (keep #(intersection line %) (:lines state))
            next-points (reduce (fn [acc p]
                                  (if (and (< (count acc) (:max-points config))
                                           (inside-garden? p) (separated? acc p))
                                    (conj acc {:pos p :born (:tick state)
                                               :generation (:generation line)})
                                    acc)) points candidates)]
        (-> state
            (assoc :points next-points)
            (update :lines conj line)
            (update :pairs conj pair))))))

(defn sketch-update [state]
  (let [next-state (update state :tick inc)]
    (if (and (not (:menu-visible? state))
             (zero? (mod (:tick next-state) (:growth-interval config))))
      (grow next-state)
      next-state)))

(defn draw-segment [[ax ay] [bx by] progress]
  (q/line ax ay (+ ax (* progress (- bx ax))) (+ ay (* progress (- by ay)))))

(defn sketch-draw [{:keys [points lines tick]}]
  (apply q/background (:background palette))
  (q/stroke-weight 1)
  (doseq [{:keys [parents born] :as line} lines]
    (let [age (- tick born)
          progress (min 1 (/ age 22))
          [a b] (clipped-endpoints line)]
      (apply q/stroke (conj (:chord palette) 35))
      (draw-segment (first parents) (second parents) progress)
      (when (and a b)
        (apply q/stroke (conj (:construction palette) (if (< age 45) 125 46)))
        ;; The bisector unfurls outward from the parents' midpoint.
        (draw-segment (:origin line) a progress)
        (draw-segment (:origin line) b progress))
      (let [[x y] (:origin line)]
        (q/no-fill)
        (apply q/stroke (conj (:chord palette) 100))
        (q/ellipse x y 4 4))))
  (doseq [{[x y] :pos :keys [born generation]} points]
    (let [age (- tick born) bloom (max 0 (- 1 (/ age 60)))]
      (when (pos? bloom)
        (q/no-fill)
        (apply q/stroke (conj (:point palette) (* 90 bloom)))
        (q/ellipse x y (+ 5 (* 22 (- 1 bloom))) (+ 5 (* 22 (- 1 bloom)))))
      (q/no-stroke)
      (apply q/fill (:point palette))
      (q/ellipse x y (if (zero? generation) 5 3) (if (zero? generation) 5 3))))
  (q/no-stroke)
  (apply q/fill (conj (:point palette) 170))
  (q/text-size 12)
  (q/text "PERPENDICULAR GARDENS" 24 (- menu/h 44))
  (q/text-size 10)
  (q/text "Click to plant a point  ·  R to regrow" 24 (- menu/h 25)))

(defn mouse-clicked [state]
  (let [handled (menu/when-mouse-pressed state)
        p [(q/mouse-x) (q/mouse-y)]]
    (if (and (not (:menu-visible? state)) (not (menu/inside-burger?))
             (inside-garden? p) (separated? (:points state) p)
             (< (count (:points state)) (:max-points config)))
      (-> handled
          (update :points conj {:pos p :born (:tick state) :generation 0})
          ;; Make room for new construction when a mature garden is planted.
          (update :lines #(vec (take-last (dec (:max-lines config)) %))))
      handled)))

(defn key-pressed [state event]
  (if (= :r (:key event))
    (merge state (initial-garden))
    state))

(registry/def-sketch "Perpendicular Gardens" '(102 145 144)
  {:host "sketch" :size [menu/w menu/h]
   :setup sketch-setup :draw sketch-draw :update sketch-update
   :mouse-clicked mouse-clicked :key-pressed key-pressed
   :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
