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
   :moon [246 227 184]
   :sparks [250 177 90]})

(defn safe-unit [direction]
  (let [length (v/mag direction)]
    (if (< length 0.0001) [0 0] (v/div direction length))))

(defn create-ball []
  {:location [(q/random (q/width)) (q/random (q/height))]
   :speed [(q/random -1.5 1.5) (q/random -1.5 1.5)]
   :acc [0 0] :mass (q/random 1 5)
   :size (q/random 3 6) :max-speed (q/random 3 7)
   :color (rand-nth (:stars palette)) :on-fire false})

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

(defn setup []
  (q/frame-rate 60)
  (q/pixel-density 1)
  {:black-ball {:location [(/ (q/width) 2) (/ (q/height) 2)]
                :speed [0 0] :acc [0 0] :mass 15 :size 36}
   :balls (mapv (fn [_] (create-ball)) (range 100))
   :fire-particles [] :tick 0
   :vortices [(create-vortex [(* 0.3 (q/width)) (* 0.42 (q/height))] 1)
              (create-vortex [(* 0.7 (q/width)) (* 0.58 (q/height))] -1)]})

(defn check-collision [ball black-ball]
  (let [distance (v/mag (v/sub (:location ball) (:location black-ball)))]
    (< distance (+ 18 (/ (:size ball) 2)))))

(defn create-explosion [location]
  (repeatedly 18 #(create-fire-particle location)))

(defn step-world [{:keys [balls black-ball fire-particles vortices] :as state}]
  (let [; First update black ball position based on mouse
        black-location (:location black-ball)
        black-speed (:speed black-ball)
        black-mass (:mass black-ball)
        mouse-direction (v/sub [(q/mouse-x) (q/mouse-y)] black-location)
        mouse-distance (max 5 (min 25 (v/mag mouse-direction)))
        mouse-magnitude (/ (* 1 black-mass 20) (* mouse-distance mouse-distance))
        mouse-force (v/mult (safe-unit mouse-direction) mouse-magnitude)
        updated-black-speed (v/limit (v/add black-speed mouse-force) 10)
        updated-black-location (v/add black-location updated-black-speed)
        updated-black-ball (bounce (assoc black-ball
                                  :location updated-black-location
                                  :speed updated-black-speed))

        ; Update fire particles
        updated-fire-particles (->> fire-particles
                                    (map update-fire-particle)
                                    (remove dead?))

        ; Then update all other balls and check for collisions
        [updated-balls new-explosions]
        (loop [myballs balls
               newballs []
               explosions []]
          (if (seq myballs)
            (let [ball (first myballs)
                  location (:location ball)
                  speed (:speed ball)
                  mass (:mass ball)
                  max-speed (:max-speed ball)
                  ; Check collision with black ball
                  colliding? (check-collision ball updated-black-ball)
                  ; If colliding and not already on fire, create explosion
                  new-explosions (if (and colliding? (not (:on-fire ball)))
                                   (concat explosions (create-explosion location))
                                   explosions)
                  ; Mouse attraction
                  mouse-dir (v/sub [(q/mouse-x) (q/mouse-y)] location)
                  org-distance (v/mag mouse-dir)
                  distance (max 5 (min 25 org-distance))
                  magnitude (/ (* 1 mass 20) (* distance distance))
                  norm-direction (safe-unit mouse-dir)
                  mouse-force (v/mult norm-direction magnitude)
                  ; Black ball repulsion
                  black-dir (v/sub location updated-black-location)
                  black-distance (max 5 (v/mag black-dir))
                  black-magnitude (/ (* 2 mass black-mass 40) (* black-distance black-distance))
                  black-force (v/mult (safe-unit black-dir) black-magnitude)
                  ; Combine forces
                  vortex-pull (reduce v/add [0 0] (map #(vortex-force location %) vortices))
                  total-force (v/add (v/add mouse-force black-force) vortex-pull)
                  updated-speed (v/add speed total-force)
                  limited-speed (v/limit updated-speed max-speed)
                  updated-location (v/add location limited-speed)]
              (recur (rest myballs)
                     (if colliding?
                       newballs  ; Remove colliding balls
                       (conj newballs (bounce (assoc ball
                                             :location updated-location
                                             :speed limited-speed
                                             :acc [0 0]
                                             :vortex-influence (min 1 (v/mag vortex-pull))
                                             :on-fire colliding?))))
                     new-explosions))
            [newballs explosions]))]
    (assoc state
           :black-ball updated-black-ball
           :balls (if (and (< (count updated-balls) 100) (zero? (mod (:tick state) 4)))
                    (conj updated-balls (create-ball)) updated-balls)
           :tick (inc (:tick state))
           :fire-particles (vec (take-last 600 (concat updated-fire-particles new-explosions))))))

(defn update-state [state]
  (if (:menu-visible? state) state (step-world state)))

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

(defn draw-attractor []
  (let [x (q/mouse-x) y (q/mouse-y)
        pulse (+ 1 (* 0.08 (Math/sin (* (q/millis) 0.002))))]
    (q/no-fill)
    (q/stroke-weight 1)
    (doseq [[diameter alpha] [[38 70] [76 35] [120 15]]]
      (q/stroke 118 178 208 alpha)
      (q/ellipse x y (* diameter pulse) (* diameter pulse)))
    (q/stroke 145 203 220 100)
    (q/line (- x 5) y (+ x 5) y)
    (q/line x (- y 5) x (+ y 5))))

(defn draw-moon [moon]
  (let [[x y] (:location moon)]
    (q/no-stroke)
    (doseq [[diameter alpha] [[100 4] [70 8] [48 12]]]
      (apply q/fill (conj (:moon palette) alpha))
      (q/ellipse x y diameter diameter))
    (apply q/fill (:moon palette))
    (q/ellipse x y 36 36)
    (q/fill 184 165 130 85)
    (q/ellipse (- x 6) (- y 5) 9 9)
    (q/ellipse (+ x 7) (+ y 4) 6 6)
    (q/no-fill)
    (q/stroke 255 244 215 70)
    (q/stroke-weight 1)
    (q/ellipse x y 44 44)))

(defn draw-state [{:keys [balls black-ball fire-particles vortices]}]
  (apply q/background (:background palette))
  (q/rect-mode :corner)
  (q/ellipse-mode :center)
  (draw-attractor)
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
  (draw-moon black-ball)
  (q/no-stroke)
  (q/fill 161 188 207)
  (q/text-font "monospace")
  (q/text-size 11)
  (q/text-align :left :bottom)
  (q/text "FIGGET-A-BALLS / ORBITAL PLAYGROUND" 22 (- (q/height) 56))
  (q/fill 94 123 147)
  (q/text-size 10)
  (q/text "Move to attract · Click to plant a vortex" 22 (- (q/height) 37))
  (q/text "C clears vortices · R resets" 22 (- (q/height) 20))
  (q/text-align :right :top)
  (q/text (str (count balls) " particles") (- (q/width) 22) 24))

(defn mouse-clicked [state]
  (if (or (:menu-visible? state) (menu/inside-burger?)) state
    (update state :vortices
            (fn [vortices]
              (vec (take-last 5
                              (conj vortices (create-vortex [(q/mouse-x) (q/mouse-y)]
                                                           (- (:spin (last vortices) -1))))))))))

(defn key-pressed [state event]
  (if (:menu-visible? state) state
    (case (:key event)
      :c (assoc state :vortices [])
      :r (merge state (setup))
      state)))

(registry/def-sketch "Figget-A-Balls" '(60 180 230)
  {:host "sketch"
   :title "Orbital playground"
   :setup setup
   :update update-state
   :draw draw-state
   :renderer :p2d
   :mouse-clicked mouse-clicked
   :key-pressed key-pressed
   :size [menu/w menu/h]
   :middleware [menu/show-frame-rate
                m/fun-mode]})
