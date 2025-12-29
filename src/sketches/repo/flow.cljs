(ns sketches.repo.flow
  (:require [quil.core :as q :include-macros true]
            [sketches.menu :as menu]
            [sketches.registry :as registry]
            [quil.middleware :as m]))

(def config
  "Configuration map for the flow sketch.
   Controls all aspects of the particle flow animation:
   - particle-count: Number of particles in the system
   - noise-zoom: Scale of the Perlin noise field (smaller = smoother flow)
   - noise-detail: Additional detail in the noise field (0-1)
   - alpha: Transparency of particles (0-255)
   - particle-size: Base size of each particle
   - initial-velocity: Starting velocity of particles
   - velocity-scale: How much the flow field affects velocity
   - max-velocity: Maximum allowed velocity
   - trail-effect: Whether to keep previous frames (creates trails)
   - background-fade: How quickly previous frames fade (0-255, 255 = no trail)
   - random-seed: Seed for random number generation
   - noise-seed: Seed for Perlin noise generation
   - mouse-influence: How strongly the mouse affects particles
   - mouse-radius: Radius of mouse influence"
  {:particle-count 2000
   :noise-zoom 0.045
   :noise-detail 0.12
   :alpha 5
   :particle-size 3
   :initial-velocity {:x 1.0 :y 1.0}
   :velocity-scale 1.0
   :max-velocity 7.0
   :trail-effect true
   :background-fade 0.1
   :random-seed 666
   :noise-seed 666
   :mouse-influence 0.8
   :mouse-radius 100})

(def palette
  "Color palette for the sketch."
  {:name       "purple haze"
   :background [(rand-int 256) (rand-int 256) (rand-int 256)]
   :colors     (vec (repeatedly 7 #(vector (rand-int 256)
                                           (rand-int 256)
                                           (rand-int 256))))})

  (defn particle
    "Creates a particle map with initial state.
   Parameters:
   - id: Unique identifier for the particle"
    [id]
    (let [{:keys [initial-velocity particle-size]} config]
      {:id        id
       :vx        (:x initial-velocity)
       :vy        (:y initial-velocity)
       :size      particle-size
       :direction 0.0
       :x         (q/random menu/w)
       :y         (q/random menu/h)
       :speed     0.0
       :color     (rand-nth (:colors palette))}))

  (defn sketch-setup
    "Returns the initial state to use for the update-render loop.
   Initializes the background and creates the particle system."
    []
    (apply q/background (:background palette))
    {:particles (mapv particle (range 0 (:particle-count config)))})

  (defn position
    "Calculates the next position based on the current, the speed and a max.
   Uses modulo to wrap around screen boundaries."
    [^number current ^number delta ^number max]
    (mod (+ current delta) max))

  (defn clamp-velocity
    "Clamps the velocity between negative and positive max-velocity."
    [^number velocity]
    (let [max-v (:max-velocity config)]
      (cond
        (> velocity max-v) max-v
        (< velocity (- max-v)) (- max-v)
        :else velocity)))

  (defn velocity
    "Calculates the next velocity by averaging the current velocity and the added delta.
   Provides smooth transitions between velocities."
    [^number current ^number delta]
    (clamp-velocity
     (* (:velocity-scale config)
        (/ (+ current delta) (+ -10 (rand-int 10))))))

  (defn direction
    "Calculates the next direction based on the previous position and id of each particle.
   Uses Perlin noise to create smooth, natural-looking flow fields."
    [^number x ^number y ^number z]
    (let [{:keys [noise-zoom noise-detail]} config]
      (* 2.0
         Math/PI
         (+ (q/noise (* x noise-zoom) (* y noise-zoom))
            (* noise-detail (q/noise (* x noise-zoom) (* y noise-zoom) (* z noise-zoom)))))))

  (defn update-particle
    "Updates a single particle's state based on its current position and velocity."
    [p]
    (let [mouse-x (q/mouse-x)
          mouse-y (q/mouse-y)
          dx (- mouse-x (:x p))
          dy (- mouse-y (:y p))
          distance (Math/sqrt (+ (* dx dx) (* dy dy)))
          mouse-factor (if (< distance (:mouse-radius config))
                        (* (:mouse-influence config)
                           (- 1.0 (/ distance (:mouse-radius config))))
                        0)
          flow-direction (direction (:x p) (:y p) (:id p))
          mouse-direction (Math/atan2 dy dx)
          final-direction (+ flow-direction (* mouse-factor (- mouse-direction flow-direction)))
          vx (velocity (:vx p) (Math/cos final-direction))
          vy (velocity (:vy p) (Math/sin final-direction))
          speed (Math/sqrt (+ (* vx vx) (* vy vy)))
          hue (mod (* speed 30) 255)
          size (+ (:particle-size config) (* 2 (/ speed (:max-velocity config))))]
      (assoc p
             :x (position (:x p) vx menu/w)
             :y (position (:y p) vy menu/h)
             :direction final-direction
             :vx vx
             :vy vy
             :speed speed
             :size size
             :color [hue (min 255 (* speed 50)) 255])))

  (defn sketch-update
    "Returns the next state to render. Updates all particles' positions and velocities."
    [{:keys [particles] :as state}]
    (assoc state :particles (mapv update-particle particles)))

  (defn apply-background
    "Applies background with fade effect if trail-effect is enabled."
    []
    (if (:trail-effect config)
      (apply q/background (conj (:background palette) (:background-fade config)))
      (apply q/background (:background palette))))

  (defn sketch-draw
    "Draws the current state to the canvas. Called on each iteration after sketch-update."
    [{:keys [particles]}]
    (apply-background)
    (q/no-stroke)
    (doseq [p particles]
      (apply q/fill (conj (:color p) (:alpha config)))
      (q/ellipse (:x p) (:y p) (:size p) (:size p))))

  (registry/def-sketch "Flow" '(120 0 10)
  {:host "sketch"
   :size [menu/w menu/h]
   :setup sketch-setup
   :draw sketch-draw
   :update sketch-update
   :mouse-clicked menu/when-mouse-pressed
   :middleware [menu/show-frame-rate
                m/fun-mode]
   :settings (fn []
               (q/pixel-density 1)
               (q/random-seed (:random-seed config))
               (q/noise-seed (:noise-seed config)))})