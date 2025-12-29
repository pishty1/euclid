(ns sketches.flow
  (:require [quil.core :as q :include-macros true]
            [menu :as menu]
            [registry :as registry]
            [quil.middleware :as m]))

(def config
  {:particle-count 3000          ; High density for network effect
   :noise-zoom 0.005             ; Zoomed in for long, smooth tendrils
   :noise-detail 0.5             ; More complex noise falloff
   :particle-size 1.5            ; Thinner, filament-like size
   :growth-speed 2.0             ; Constant growth speed (replacing max-velocity)
   :trail-effect true
   :background-fade 10           ; Very low fade = persistent trails (mycelium map)
   :random-seed 42
   :noise-seed 99
   :sensor-radius 300            ; Distance at which fungus senses food (mouse)
   :sensor-strength 0.15})       ; How hard it steers towards food (0.0 to 1.0)

(def palette
  {:name       "bioluminescence"
   :background [10 10 20]     ; Dark substrate
   :colors     [[60 255 100]  ; Toxic Green
                [0 255 200]   ; Cyan Spores
                [150 50 255]  ; Purple Rot
                [255 255 255] ; New Growth White
                [40 100 40]]})

(defn particle
  [id]
  {:id    id
   :vx    0.0
   :vy    0.0
   :x     (q/random menu/w)
   :y     (q/random menu/h)
   :color (rand-nth (:colors palette))})

(defn sketch-setup
  "Returns the initial state to use for the update-render loop.
   Initializes the background and creates the particle system."
  []
  (apply q/background (:background palette))
  {:particles (mapv particle (range 0 (:particle-count config)))})

(defn lerp-angle [current target amt]
  (let [diff (- target current)
        ;; Normalize diff to -PI to +PI to turn shortest direction
        d (-> diff (+ Math/PI) (mod (* 2 Math/PI)) (- Math/PI))]
    (+ current (* d amt))))

(defn update-particle [p]
  (let [;; 1. Sense Food (Mouse)
        mx (q/mouse-x)
        my (q/mouse-y)
        dx (- mx (:x p))
        dy (- my (:y p))
        dist-to-food (Math/sqrt (+ (* dx dx) (* dy dy)))
        
        ;; 2. Determine Natural Growth Direction (Noise)
        noise-val (q/noise (* (:x p) (:noise-zoom config)) 
                           (* (:y p) (:noise-zoom config))
                           (* (q/frame-count) 0.001))
        noise-angle (* noise-val 4 Math/PI) ;; 4PI allows loops and whorls
        
        ;; 3. Determine Food Attraction
        ;; Only sense if close enough, otherwise attraction is 0
        sensed? (< dist-to-food (:sensor-radius config))
        food-angle (Math/atan2 dy dx)
        
        ;; Calculate steering force based on distance (closer = stronger pull)
        pull-strength (if sensed? 
                        (q/map-range dist-to-food 0 (:sensor-radius config) 0.2 0.01)
                        0)
        
        ;; 4. Combine Forces
        ;; Blend natural noise with food attraction
        final-angle (if sensed?
                      (lerp-angle noise-angle food-angle pull-strength)
                      noise-angle)
        
        ;; 5. Execute Growth (Movement)
        speed (:growth-speed config)
        vx (* speed (Math/cos final-angle))
        vy (* speed (Math/sin final-angle))
        
        ;; Dynamic coloring: Bright white when near food, darker when far
        base-color (rand-nth (:colors palette))
        vitality (if sensed? 255 100)]
    
    (assoc p
           :x (mod (+ (:x p) vx) menu/w)
           :y (mod (+ (:y p) vy) menu/h)
           :vx vx 
           :vy vy
           :color (if (< dist-to-food 50) 
                    [255 255 255] ;; Hot white center
                    base-color))))

(defn sketch-update
  "Returns the next state to render. Updates all particles' positions and velocities."
  [{:keys [particles] :as state}]
  (assoc state :particles (mapv update-particle particles)))

(defn sketch-draw [{:keys [particles]}]
  ;; 1. Draw the "fading" background (the substrate)
  (if (:trail-effect config)
    (do
      (q/no-stroke)
      (apply q/fill (conj (:background palette) (:background-fade config)))
      (q/rect 0 0 menu/w menu/h))
    (apply q/background (:background palette)))

  ;; 2. Draw the Hyphae
  (doseq [p particles]
    (let [[r g b] (:color p)]
      ;; Low alpha makes overlapping trails glow brighter
      (q/stroke r g b 80)
      (q/stroke-weight (:particle-size config))
      ;; Draw a line from previous pos to current (simulates filament)
      (q/line (- (:x p) (:vx p)) 
              (- (:y p) (:vy p)) 
              (:x p) 
              (:y p)))))

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
