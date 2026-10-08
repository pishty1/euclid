(ns sketches.cell-world)

(def max-cells 24000)
(def grid-size 24)
(def colors ["#56db89" "#68baff" "#efaa8c"])
(defn random [a b] (+ a (* (js/Math.random) (- b a))))
(defn make-world [w h]
  (let [world #js {:width w :height h :n 0 :bn 0 :bodies #js []
                  :x (js/Float32Array. max-cells) :y (js/Float32Array. max-cells)
                  :vx (js/Float32Array. max-cells) :vy (js/Float32Array. max-cells)
                  :fx (js/Float32Array. max-cells) :fy (js/Float32Array. max-cells)
                  :kind (js/Uint8Array. max-cells) :owner (js/Int32Array. max-cells)
                  :next (js/Int32Array. max-cells)
                  :ba (js/Int32Array. (* max-cells 6)) :bb (js/Int32Array. (* max-cells 6))
                  :rest (js/Float32Array. (* max-cells 6))}]
    (aset world "cols" (inc (js/Math.ceil (/ w grid-size))))
    (aset world "rows" (inc (js/Math.ceil (/ h grid-size))))
    (aset world "grid" (js/Int32Array. (* (aget world "cols") (aget world "rows"))))
    world))

(defn body-shape [kind]
  (case kind
    0 (let [n (int (random 18 58)) phase (random 0 6.28)]
        (mapv (fn [i] [(* i 5.2) (* 10 (js/Math.sin (+ phase (* i 0.19))))]) (range n)))
    1 (let [n (int (random 15 24)) radius (/ (* n 5) (* 2 js/Math.PI))]
        (into (mapv (fn [i] (let [a (/ (* i 2 js/Math.PI) n)] [(* radius (js/Math.cos a)) (* radius (js/Math.sin a))])) (range n))
              (map (fn [i] (let [a (/ (* i 2 js/Math.PI) 6)] [(* 6 (js/Math.cos a)) (* 6 (js/Math.sin a))])) (range 6))))
    2 (vec (for [a (range -2 3) b (range -2 3) :when (<= (js/Math.abs (+ a b)) 2)]
             [(* 4.8 (+ a (* b 0.5))) (* b 4.16)]))))

(defn add-body! [world]
  (let [kind (let [r (js/Math.random)] (cond (< r 0.3) 0 (< r 0.73) 1 :else 2))
        shape (body-shape kind) count (count shape) start (aget world "n")
        angle (random 0 6.28) cs (js/Math.cos angle) sn (js/Math.sin angle)
        rotated (mapv (fn [[x y]] [(- (* x cs) (* y sn)) (+ (* x sn) (* y cs))]) shape)
        min-x (reduce min (map first rotated)) max-x (reduce max (map first rotated))
        min-y (reduce min (map second rotated)) max-y (reduce max (map second rotated))
        ;; A denser habitat at the right, with open water to the left.
        preferred-x (* (aget world "width") (if (< (js/Math.random) 0.65) (random 0.48 0.98) (random 0.02 0.98)))
        preferred-y (random 85 (max 100 (- (aget world "height") 90)))
        cx (max (- 4 min-x) (min (- (aget world "width") 4 max-x) preferred-x))
        cy (max (- 4 min-y) (min (- (aget world "height") 4 max-y) preferred-y))
        body-id (.-length (aget world "bodies")) bond-start (aget world "bn")]
    (when (<= (+ start count) max-cells)
      (doseq [[i [x y]] (map-indexed vector shape)]
        (let [index (+ start i)]
          (aset (aget world "x") index (max 4 (min (- (aget world "width") 4) (+ cx (- (* x cs) (* y sn))))))
          (aset (aget world "y") index (max 4 (min (- (aget world "height") 4) (+ cy (+ (* x sn) (* y cs))))))
          (aset (aget world "vx") index (* cs 0.12)) (aset (aget world "vy") index (* sn 0.12))
          (aset (aget world "kind") index kind) (aset (aget world "owner") index body-id)))
      (let [bond! (fn [a b]
                    (let [[ax ay] (nth shape a) [bx by] (nth shape b) index (aget world "bn")]
                      (aset (aget world "ba") index (+ start a)) (aset (aget world "bb") index (+ start b))
                      (aset (aget world "rest") index (js/Math.hypot (- ax bx) (- ay by)))
                      (aset world "bn" (inc index))))]
        (if (= kind 0)
          (doseq [i (range (dec count))] (bond! i (inc i)))
          (doseq [a (range count) b (range (inc a) count)
                  :let [[ax ay] (nth shape a) [bx by] (nth shape b)]
                  :when (< (js/Math.hypot (- ax bx) (- ay by)) (if (= kind 1) 9.5 5.4))]
            (bond! a b)))
        (when (= kind 1)
          (let [outer (- count 6)]
            (doseq [i (range 0 outer 3)]
              (bond! i (+ outer (mod (int (js/Math.round (/ (* i 6) outer))) 6)))))))
      (.push (aget world "bodies") #js {:start start :end (+ start count) :bond-start bond-start :bond-end (aget world "bn")
                                 :kind kind :angle angle :phase (random 0 6.28)})
      (aset world "n" (+ start count))
      true)))

(defn populate! [world target]
  (loop [] (when (and (< (aget world "n") target) (< (aget world "n") (- max-cells 60)))
             (add-body! world) (recur))) world)

(defn trim! [world target]
  (loop []
    (when (and (> (aget world "n") target) (> (.-length (aget world "bodies")) 12))
      (let [body (.pop (aget world "bodies"))]
        (aset world "n" (aget body "start")) (aset world "bn" (aget body "bond-start")))
      (recur))) world)

(defn step! [world tick currents?]
  (let [n (aget world "n") x (aget world "x") y (aget world "y") vx (aget world "vx") vy (aget world "vy")
        fx (aget world "fx") fy (aget world "fy") kinds (aget world "kind") owners (aget world "owner")
        grid (aget world "grid") links (aget world "next") cols (aget world "cols") rows (aget world "rows")
        w (aget world "width") h (aget world "height")]
    (.fill fx 0 0 n) (.fill fy 0 0 n) (.fill grid -1)
    (dotimes [i n]
      (let [gx (min (dec cols) (max 0 (int (/ (aget x i) grid-size))))
            gy (min (dec rows) (max 0 (int (/ (aget y i) grid-size)))) key (+ gx (* gy cols))]
        (aset links i (aget grid key)) (aset grid key i)))
    ;; Only local pairs are considered; work grows with local density, not n².
    (dotimes [i n]
      (let [px (aget x i) py (aget y i) gx (int (/ px grid-size)) gy (int (/ py grid-size))
            kind (aget kinds i)]
        (dotimes [neighbor 9]
          (let [yy (+ (dec gy) (int (/ neighbor 3))) xx (+ (dec gx) (mod neighbor 3))]
            (when (and (<= 0 yy) (< yy rows) (<= 0 xx) (< xx cols))
          (loop [j (aget grid (+ xx (* yy cols)))]
            (when (>= j 0)
              (when (and (> j i) (not= (aget owners i) (aget owners j)))
                (let [dx (- (aget x j) px) dy (- (aget y j) py) d2 (+ (* dx dx) (* dy dy))]
                  (when (< d2 400)
                    (let [d (max 0.1 (js/Math.sqrt d2)) ux (/ dx d) uy (/ dy d)
                          other (aget kinds j) repulsion (if (< d 4.8) (* -0.045 (- 4.8 d)) 0)
                          weight (* 0.004 (- 1 (/ d 20)))
                          a (+ repulsion (if (and (= kind 0) (= other 2)) weight 0))
                          b (+ repulsion (if (and (= other 0) (= kind 2)) weight 0))]
                      (aset fx i (+ (aget fx i) (* ux a))) (aset fy i (+ (aget fy i) (* uy a)))
                      (aset fx j (- (aget fx j) (* ux b))) (aset fy j (- (aget fy j) (* uy b)))))))
              (recur (aget links j)))))))))
    (dotimes [index (aget world "bn")]
      (let [a (aget (aget world "ba") index) b (aget (aget world "bb") index)
            dx (- (aget x b) (aget x a)) dy (- (aget y b) (aget y a))
            d (max 0.1 (js/Math.hypot dx dy)) ux (/ dx d) uy (/ dy d)
            damping (* 0.08 (+ (* (- (aget vx b) (aget vx a)) ux) (* (- (aget vy b) (aget vy a)) uy)))
            force (+ (* 0.065 (- d (aget (aget world "rest") index))) damping)]
        (aset fx a (+ (aget fx a) (* ux force))) (aset fy a (+ (aget fy a) (* uy force)))
        (aset fx b (- (aget fx b) (* ux force))) (aset fy b (- (aget fy b) (* uy force)))))
    (doseq [body (array-seq (aget world "bodies"))]
      (let [start (aget body "start") end (aget body "end") kind (aget body "kind")
            angle (+ (aget body "angle") (* 0.003 (js/Math.sin (+ (aget body "phase") (* tick 0.008)))))
            ax (* 0.012 (js/Math.cos angle)) ay (* 0.012 (js/Math.sin angle))]
        (aset body "angle" angle)
        (loop [i start]
          (when (< i end)
            (let [motor (if (= kind 0) (if (< (- i start) 3) 2.5 0.25) (if (= kind 2) 0.15 0.4))
                  dx (- (aget x i) (aget x start)) dy (- (aget y i) (aget y start))
                  spin (if (= kind 1) (* 0.0008 (js/Math.sin (+ (aget body "phase") (* tick 0.01)))) 0)]
              (aset fx i (+ (aget fx i) (* ax motor) (* (- dy) spin)))
              (aset fy i (+ (aget fy i) (* ay motor) (* dx spin))))
            (recur (inc i))))))
    (dotimes [i n]
      (let [px (aget x i) py (aget y i)
            swirl (if currents? 0.003 0)
            sx (* swirl (js/Math.sin (+ (/ py 140) (* tick 0.001))))
            sy (* swirl (js/Math.cos (- (/ px 160) (* tick 0.001))))
            dx (max -1.8 (min 1.8 (+ (* 0.965 (aget vx i)) (aget fx i) sx)))
            dy (max -1.8 (min 1.8 (+ (* 0.965 (aget vy i)) (aget fy i) sy)))
            nx (+ px dx) ny (+ py dy)]
        (aset vx i (if (or (< nx 3) (> nx (- w 3))) (* -0.8 dx) dx))
        (aset vy i (if (or (< ny 3) (> ny (- h 3))) (* -0.8 dy) dy))
        (aset x i (max 3 (min (- w 3) nx))) (aset y i (max 3 (min (- h 3) ny)))))
    world))

(defn resize! [world w h]
  (let [sx (/ w (aget world "width")) sy (/ h (aget world "height"))]
    (dotimes [i (aget world "n")] (aset (aget world "x") i (* sx (aget (aget world "x") i))) (aset (aget world "y") i (* sy (aget (aget world "y") i))))
    (aset world "width" w) (aset world "height" h)
    (aset world "cols" (inc (js/Math.ceil (/ w grid-size))))
    (aset world "rows" (inc (js/Math.ceil (/ h grid-size))))
    (aset world "grid" (js/Int32Array. (* (aget world "cols") (aget world "rows"))))
    world))

(defn draw! [world ctx gradient]
  (.save ctx)
  (set! (.-fillStyle ctx) gradient) (.fillRect ctx 0 0 (aget world "width") (aget world "height"))
  (let [x (aget world "x") y (aget world "y") kinds (aget world "kind")]
    (dotimes [kind 3]
      (set! (.-strokeStyle ctx) (nth colors kind))
      (.beginPath ctx)
      (dotimes [b (aget world "bn")]
        (let [a (aget (aget world "ba") b) other (aget (aget world "bb") b)]
          (when (= kind (aget kinds a))
            (.moveTo ctx (aget x a) (aget y a)) (.lineTo ctx (aget x other) (aget y other)))))
      (set! (.-globalAlpha ctx) 0.24) (set! (.-lineWidth ctx) 0.65) (.stroke ctx)
      (.beginPath ctx)
      (dotimes [i (aget world "n")]
        (when (= kind (aget kinds i))
          (let [r (if (= kind 2) 1.65 1.9) px (aget x i) py (aget y i)]
            (.moveTo ctx (+ px r) py) (.arc ctx px py r 0 (* 2 js/Math.PI)))))
      (set! (.-globalAlpha ctx) 0.07) (set! (.-lineWidth ctx) 5) (.stroke ctx)
      (set! (.-globalAlpha ctx) 0.77) (set! (.-lineWidth ctx) 0.9) (.stroke ctx)))
  (.restore ctx))
