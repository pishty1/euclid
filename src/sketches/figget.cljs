(ns sketches.figget
  (:require
   [quil.core :as q]
   [menu :as menu]
   [registry :as registry]
   [quil.middleware :as m]
   [utils.vectorop :as v]))

(def palette
  {:background [7 13 24]
   :stars [[102 215 233] [145 185 237] [157 234 218]]
   :vortex [176 145 238]
   :positive [250 177 90]
   :negative [102 215 233]
   :sparks [250 177 90]})

(defn safe-unit [direction]
  (let [length (v/mag direction)]
    (if (< length 0.0001) [0 0] (v/div direction length))))

(defn create-ball [id]
  {:location [(q/random (q/width)) (q/random (q/height))]
   :speed [(q/random -1.5 1.5) (q/random -1.5 1.5)]
   :acc [0 0] :mass (q/random 1 5)
   :size (q/random 3 6) :max-speed (q/random 3 7)
   :charge (if (even? id) 1 -1)
   :color (if (even? id) (:positive palette) (:negative palette))})

(defn bounce [ball]
  (let [[x y] (:location ball) [vx vy] (:speed ball)
        width (q/width) height (q/height) radius (max 3 (/ (:size ball 6) 2))]
    (assoc ball :location [(max radius (min (- width radius) x)) (max radius (min (- height radius) y))]
                :speed [(if (or (< x radius) (> x (- width radius))) (- vx) vx)
                        (if (or (< y radius) (> y (- height radius))) (- vy) vy)])))

(defn create-vortex [location spin]
  {:location location :spin spin
   :radius (* 0.32 (min (q/width) (q/height)))})

(defn vortex-force [location {:keys [spin radius] center :location}]
  (let [direction (v/sub center location)
        distance (v/mag direction)
        [ux uy] (safe-unit direction)
        influence (max 0 (- 1 (/ distance radius)))]
    (v/mult (v/add (v/mult [ux uy] 0.35)
                  (v/mult [(- uy) ux] (* spin 1.3))) influence)))

(defn blend-color [a b amount]
  (mapv (fn [x y] (+ x (* amount (- y x)))) a b))

(defn create-fire-particle [location]
  {:location location
   :velocity [(* (q/random-gaussian) 2.8)
              (* (q/random-gaussian) 2.8)]
   :acceleration [0 0]
   :lifespan 255
   :mass 10
   :size (q/random 1.5 4)})

(defn dead? [{:keys [lifespan]}]
  (< lifespan 0.0))

(defn update-fire-particle [{:keys [acceleration velocity location lifespan] :as particle}]
  (let [velocity (v/add velocity acceleration)]
    (assoc particle
           :velocity velocity
           :location (v/add velocity location)
           :lifespan (- lifespan 7.0)
           :acceleration [0 0])))

(defn display-fire-particle [{:keys [lifespan size velocity] [x y] :location}]
  (let [[vx vy] velocity alpha (max 0 lifespan)]
    (apply q/stroke (conj (:sparks palette) alpha))
    (q/stroke-weight 1)
    (q/line x y (- x (* vx 2)) (- y (* vy 2)))
    (q/no-stroke)
    (apply q/fill (conj (:sparks palette) (max 0 lifespan)))
    (q/ellipse x y size size)))

(defn create-dipole [id]
  {:location [(* (+ 0.2 (* 0.2 id)) (q/width))
              (* (if (even? id) 0.35 0.65) (q/height))]
   :speed [(q/random -1 1) (q/random -1 1)]
   :angle (* id 1.7) :polarity (if (even? id) 1 -1) :size 24})

(defn poles [{:keys [location angle polarity]}]
  (let [offset [(* 10 (Math/cos angle)) (* 10 (Math/sin angle))]]
    [[(v/add location offset) polarity]
     [(v/sub location offset) (- polarity)]]))

(defn magnetic-force [location charge dipole]
  (reduce v/add [0 0]
          (for [[pole polarity] (poles dipole)
                :let [direction (v/sub pole location)
                      distance (v/mag direction)]]
            ;; Softened charges avoid singular accelerations at a pole.
            (v/mult (safe-unit direction)
                    (/ (* -1800 charge polarity) (+ 400 (* distance distance)))))))

(defn setup []
  (q/frame-rate 60)
  (q/pixel-density 1)
  {:balls (mapv create-ball (range 100))
   :dipoles (mapv create-dipole (range 4))
   :fire-particles [] :tick 0 :paused? false :reversals 0
   :vortices [(create-vortex [(* 0.3 (q/width)) (* 0.42 (q/height))] 1)
              (create-vortex [(* 0.7 (q/width)) (* 0.58 (q/height))] -1)]})

(defn create-explosion [location]
  (repeatedly 18 #(create-fire-particle location)))

(defn step-world [{:keys [balls dipoles fire-particles vortices tick] :as state}]
  (let [updated-balls
        (mapv (fn [{:keys [location speed charge max-speed] :as ball}]
                (let [swirl (reduce v/add [0 0] (map #(vortex-force location %) vortices))
                      magnetic (reduce v/add [0 0] (map #(magnetic-force location charge %) dipoles))
                      speed (v/limit (v/add (v/mult speed 0.995) (v/add swirl magnetic)) max-speed)]
                  (bounce (assoc ball :location (v/add location speed) :speed speed
                                      :vortex-influence (min 1 (v/mag swirl)))))) balls)
        updated-dipoles
        (mapv (fn [{:keys [location speed angle] :as dipole}]
                (let [swirl (reduce v/add [0 0] (map #(vortex-force location %) vortices))
                      ;; The swarm pushes back on the source of its magnetic field.
                      recoil (reduce v/add [0 0]
                                     (map #(v/mult (magnetic-force (:location %) (:charge %) dipole) -0.035) balls))
                      speed (v/limit (v/add (v/mult speed 0.995) (v/add (v/mult swirl 0.45) recoil)) 2.5)]
                  (bounce (assoc dipole :location (v/add location speed) :speed speed
                                       :angle (+ angle (* 0.012 (:polarity dipole))
                                                 (* 0.025 (- (first recoil) (second recoil)))))))) dipoles)
        ;; A core has a three-second recovery period, preventing repeated flips
        ;; while a dipole remains inside it.
        [vortices dipoles flashes]
        (reduce (fn [[fields magnets flashes] [index vortex]]
                  (if-let [magnet-index
                           (when (>= tick (:ready-at vortex 0))
                             (first (keep-indexed
                                     (fn [i magnet]
                                       (when (< (v/mag (v/sub (:location magnet) (:location vortex))) 26) i)) magnets)))]
                    [(assoc fields index (assoc vortex :spin (- (:spin vortex)) :ready-at (+ tick 180)))
                     (update-in magnets [magnet-index :polarity] -)
                     (conj flashes (:location vortex))]
                    [fields magnets flashes]))
                [vortices updated-dipoles []] (map-indexed vector vortices))]
    (assoc state :balls updated-balls :dipoles dipoles :vortices vortices :tick (inc tick)
                 :reversals (+ (:reversals state) (count flashes))
                 :fire-particles (vec (take-last 600
                                       (concat (remove dead? (map update-fire-particle fire-particles))
                                               (mapcat create-explosion flashes)))))))

(defn update-state [state]
  (if (or (:menu-visible? state) (:paused? state)) state (step-world state)))

(defn draw-vortex [{[x y] :location :keys [spin radius]}]
  (let [angle (* spin (q/millis) 0.0004)]
    (q/no-fill)
    (q/stroke-weight 1)
    (apply q/stroke (conj (:vortex palette) 14))
    (q/ellipse x y (* 2 radius) (* 2 radius))
    (q/no-stroke)
    (doseq [[diameter alpha] [[86 4] [62 7] [40 14]]]
      (apply q/fill (conj (:vortex palette) alpha))
      (q/ellipse x y diameter diameter))
    (q/no-fill)
    (apply q/stroke (conj (:vortex palette) 160))
    (q/ellipse x y 38 38)
    (apply q/stroke (conj (:vortex palette) 70))
    (q/ellipse x y 22 22)
    (doseq [i (range 8)]
      (let [a (+ angle (* i (/ (* 2 Math/PI) 8)))
            c (Math/cos a) s (Math/sin a)]
        (apply q/stroke (conj (:vortex palette) (+ 65 (* i 12))))
        (q/line (+ x (* 23 c)) (+ y (* 23 s))
                (+ x (* 29 c)) (+ y (* 29 s)))))
    (q/no-stroke)
    (apply q/fill (:vortex palette))
    (q/ellipse x y 4 4)))

(defn draw-dipole [dipole]
  (let [[[a qa] [b qb]] (poles dipole)
        [x y] (:location dipole)]
    (q/stroke-weight 2)
    (q/stroke 184 202 214 150)
    (q/line (first a) (second a) (first b) (second b))
    (q/no-fill)
    (q/stroke-weight 1)
    (q/stroke 184 202 214 35)
    (q/ellipse x y 32 32)
    (q/no-stroke)
    (doseq [[[px py] charge] [[a qa] [b qb]]]
      (let [color (if (pos? charge) (:positive palette) (:negative palette))]
        (apply q/fill (conj color 20))
        (q/ellipse px py 18 18)
        (apply q/fill color)
        (q/ellipse px py 6 6)))))

(defn draw-state [{:keys [balls dipoles fire-particles vortices paused? reversals]}]
  (apply q/background (:background palette))
  (q/rect-mode :corner)
  (q/ellipse-mode :center)
  (doseq [vortex vortices] (draw-vortex vortex))
  (doseq [{[x y] :location [vx vy] :speed :keys [color size vortex-influence]} balls]
    (let [color (blend-color color (:vortex palette) (or vortex-influence 0))]
    (q/stroke-weight 1)
    (doseq [i (range 1 5)]
      (apply q/stroke (conj color (- 110 (* i 20))))
      (q/line (- x (* vx (dec i) 2)) (- y (* vy (dec i) 2))
              (- x (* vx i 2)) (- y (* vy i 2))))
    (q/no-stroke)
    (apply q/fill (conj color 12))
    (q/ellipse x y (* size 4) (* size 4))
    (apply q/fill (conj color 230))
    (q/ellipse x y size size)))
  (doseq [particle fire-particles] (display-fire-particle particle))
  (doseq [dipole dipoles] (draw-dipole dipole))
  (q/no-stroke)
  (q/fill 161 188 207)
  (q/text-font "monospace")
  (q/text-size 11)
  (q/text-align :left :bottom)
  (q/text "FIGGET-A-BALLS / DIPOLE ECOLOGY" 22 (- (q/height) 56))
  (q/fill 94 123 147)
  (q/text-size 10)
  (q/text "Opposite charges attract · Core crossings flip spin" 22 (- (q/height) 37))
  (q/text "Space pauses · C clears vortices · R resets" 22 (- (q/height) 20))
  (q/text-align :right :top)
  (q/text (str (count balls) " particles / " (count dipoles) " dipoles") (- (q/width) 22) 24)
  (q/text (if paused? "PAUSED" (str reversals " core reversals")) (- (q/width) 22) 41))

(defn key-pressed [state event]
  (if (:menu-visible? state) state
    (case (:key event)
      :space (update state :paused? not)
      :c (assoc state :vortices [])
      :r (merge state (setup))
      state)))

(registry/def-sketch "Figget-A-Balls" '(60 180 230)
  {:host "sketch"
   :title "Dipole ecology"
   :setup setup
   :update update-state
   :draw draw-state
   :renderer :p2d
   :key-pressed key-pressed
   :size [menu/w menu/h]
   :middleware [menu/show-frame-rate
                m/fun-mode]})
