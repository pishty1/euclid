(ns sketches.flow
  (:require [quil.core :as q :include-macros true]
            [menu :as menu]
            [registry :as registry]
            [quil.middleware :as m]))

(def config
  {:seed 42 :growth-interval 12 :max-points 140 :max-lines 220
   :min-spacing 13 :margin 55 :neighbor-count 8})

(def palette
  {:background [16 23 25]
   :construction [102 145 144]
   :chord [190 143 93]
   :point [233 222 192]})

(defn prime? [n]
  (and (>= n 2)
       (or (= n 2)
           (and (odd? n)
                (not-any? #(zero? (mod n %))
                          (range 3 (inc (int (Math/sqrt n))) 2))))))

(defn prime-gap? [a b]
  (prime? (Math/abs (- (:number a) (:number b)))))

(defn numbered-point [points attributes]
  (assoc attributes :number (inc (count points))))

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
        radius (* 0.27 (min menu/w menu/h))
        phase (q/random (* 2 Math/PI))
        golden-angle (* Math/PI (- 3 (Math/sqrt 5)))]
    {:points (mapv (fn [i]
                     (let [n (inc i)
                           angle (+ phase (* n golden-angle))
                           r (* radius (Math/sqrt (/ n 13)))]
                       {:pos [(+ cx (* r (Math/cos angle)))
                              (+ cy (* r (Math/sin angle)))]
                        :number n :born 0 :generation 0})) (range 13))
     :lines [] :pairs #{} :tick 0}))

(defn sketch-setup []
  (q/frame-rate 30)
  (q/random-seed (:seed config))
  (initial-garden))

(defn neighbor-indices [points a]
  (->> (range (count points))
       (remove #{a})
       (filter #(prime-gap? (nth points a) (nth points %)))
       (sort-by #(distance-squared (:pos (nth points a)) (:pos (nth points %))))
       (take (:neighbor-count config))
       vec))

(defn empty-circle? [points center radius-squared]
  ;; Boundary points are allowed. A point inside the circle suppresses growth.
  (every? #(>= (distance-squared (:pos %) center) (- radius-squared 0.01)) points))

(defn growth-site [points line other]
  ;; Bisectors sharing a parent meet at a triangle's circumcenter.
  (when (some (set (:parent-ids line)) (:parent-ids other))
    (when-let [center (intersection line other)]
      (let [radius-squared (distance-squared center (first (:parents line)))
            max-radius (* 0.32 (min menu/w menu/h))]
        (when (and (inside-garden? center)
                   (< radius-squared (* max-radius max-radius))
                   (empty-circle? points center radius-squared))
          {:pos center :radius-squared radius-squared})))))

(defn grow [state]
  (let [points (:points state)
        ;; New points feed back into the local neighborhood on the next step.
        a (if (< (q/random 1) 0.6)
            (max 0 (- (count points) 1 (int (q/random (min 10 (count points))))))
            (int (q/random (count points))))
        neighbors (neighbor-indices points a)
        available (filterv #(not (contains? (:pairs state) (vec (sort [a %])))) neighbors)]
    (if (or (empty? available)
            (>= (count (:lines state)) (:max-lines config))
            (>= (count points) (:max-points config)))
      state
      (let [b (nth available (int (q/random (count available))))
            pair (vec (sort [a b]))
            pa (:pos (nth points a)) pb (:pos (nth points b))
            line (assoc (bisector pa pb)
                        :parents [pa pb] :parent-ids pair :born (:tick state)
                        :prime-gap (Math/abs (- (:number (nth points a)) (:number (nth points b))))
                        :generation (inc (max (:generation (nth points a))
                                              (:generation (nth points b)))))
            ;; Fill the largest vacant pocket first; new seeds suppress others.
            sites (sort-by :radius-squared >
                           (keep #(growth-site points line %) (:lines state)))
            next-points (reduce (fn [acc {:keys [pos radius-squared]}]
                                  (if (and (< (count acc) (:max-points config))
                                           (separated? acc pos)
                                           (empty-circle? acc pos radius-squared))
                                    (conj acc (numbered-point acc {:pos pos :born (:tick state)
                                               :generation (:generation line)
                                               :bloom-radius (Math/sqrt radius-squared)}))
                                    acc)) points sites)]
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
  (doseq [{[x y] :pos :keys [born generation bloom-radius number]} points]
    (let [age (- tick born) bloom (max 0 (- 1 (/ age 60)))]
      (when (pos? bloom)
        (q/no-fill)
        (apply q/stroke (conj (:point palette) (* 90 bloom)))
        (let [diameter (+ 5 (* 2 (or bloom-radius 11) (- 1 bloom)))]
          (q/ellipse x y diameter diameter)))
      (q/no-stroke)
      (apply q/fill (if (prime? number) [244 192 103] (:construction palette)))
      (let [size (if (prime? number) 6 3)]
        (q/ellipse x y size size))
      (when (prime? number)
        (q/text-size 9)
        (q/text (str number) (+ x 7) (- y 5)))))
  (q/no-stroke)
  (apply q/fill (conj (:point palette) 170))
  (q/text-size 12)
  (q/text "PRIME GARDENS" 24 (- menu/h 56))
  (q/text-size 10)
  (q/text "Prime gaps connect · Gold points are prime" 24 (- menu/h 37))
  (q/text "Click to plant a point · R to regrow" 24 (- menu/h 20)))

(defn mouse-clicked [state]
  (let [handled (menu/when-mouse-pressed state)
        p [(q/mouse-x) (q/mouse-y)]]
    (if (and (not (:menu-visible? state)) (not (menu/inside-burger?))
             (inside-garden? p) (separated? (:points state) p)
             (< (count (:points state)) (:max-points config)))
      (-> handled
          (update :points #(conj % (numbered-point % {:pos p :born (:tick state) :generation 0})))
          ;; Make room for new construction when a mature garden is planted.
          (update :lines #(vec (take-last (dec (:max-lines config)) %))))
      handled)))

(defn key-pressed [state event]
  (if (= :r (:key event))
    (merge state (initial-garden))
    state))

(registry/def-sketch "Prime Gardens" '(102 145 144)
  {:host "sketch" :size [menu/w menu/h]
   :setup sketch-setup :draw sketch-draw :update sketch-update
   :mouse-clicked mouse-clicked :key-pressed key-pressed
   :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
