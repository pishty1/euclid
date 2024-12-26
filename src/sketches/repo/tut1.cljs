(ns sketches.repo.tut1
  (:require
   [quil.core :as q]
   [sketches.menu :as menu]
   [quil.middleware :as m]
   )
  )

;; Example 1 - Cross with Circle
;; Taken from Section 2.2.1, p20

;; size(500, 300);
;; smooth();
;; background(230, 230, 230);
;; //draw two crossed lines
;; stroke(130, 0, 0);
;; strokeWeight(4);
;; line(width/2 - 70, height/2 - 70, width/2 + 70, height/2 + 70);
;; line(width/2 + 70, height/2 - 70, width/2 - 70, height/2 + 70);
;; //draw a filled circle too
;; fill(255, 150);
;; ellipse(width/2, height/2, 50, 50);

(defn setup []
  (q/smooth)
  (q/background 230 230 230)
  (q/stroke 130, 0 0)
  (q/stroke-weight 4)
  (let [cross-size      70
        circ-size       50
        canvas-x-center (/ (q/width) 2)
        canvas-y-center (/ (q/height) 2)]

    {:cross1 {:angle 0
              :base-size cross-size
              :cross-size cross-size
              :x (- canvas-x-center 100)  ; Position left of center
              :y canvas-y-center
              :hue 0}
     :cross2 {:angle (/ Math/PI 2)  ; Start at 90 degrees
              :base-size cross-size
              :cross-size cross-size
              :x (+ canvas-x-center 100)  ; Position right of center
              :y canvas-y-center
              :hue 180}  ; Start with opposite color
     :circ-size circ-size
     :canvas-x-center canvas-x-center 
     :canvas-y-center canvas-y-center}))

(defn draw-cross [{:keys [angle cross-size x y hue]}]
  (q/push-matrix)
  (q/translate x y)
  (q/rotate angle)
  
  (doseq [i (range 5)]
    (let [size (* cross-size (- 1 (* i 0.15)))
          opacity (- 100 (* i 20))]
      (q/stroke hue 80 90 opacity)
      (q/line (- size) (- size) size size)
      (q/line size (- size) (- size) size)))
  
  (q/pop-matrix))

(defn draw-state [{:keys [cross1 cross2 canvas-x-center canvas-y-center circ-size]}]
  ; Semi-transparent background for trail effect
  (q/fill 190 30 130 40)
  (q/no-stroke)
  (q/rect 0 0 (q/width) (q/height))
  
  ; Set color mode to HSB for easier color manipulation
  (q/color-mode :hsb 360 100 100 100)
  (q/stroke-weight 3)
  
  ; Draw both crosses
  (draw-cross cross1)
  (draw-cross cross2)
  
  ; Draw the circle in the center
  (q/fill 255 150)
  (q/ellipse canvas-x-center canvas-y-center circ-size circ-size))

(defn calculate-interaction [cross1 cross2]
  ; Calculate distance and angle between crosses
  (let [dx (- (:x cross2) (:x cross1))
        dy (- (:y cross2) (:y cross1))
        distance (Math/sqrt (+ (* dx dx) (* dy dy)))
        angle (Math/atan2 dy dx)
        interaction-factor (/ 300 (+ distance 50))]  ; Smoother falloff
    {:distance distance
     :angle angle
     :factor interaction-factor}))

(defn update-cross-position [cross center-x center-y orbit-radius time]
  (let [orbit-speed 0.01
        x (+ center-x (* orbit-radius (Math/cos (* time orbit-speed))))
        y (+ center-y (* orbit-radius (Math/sin (* time orbit-speed))))]
    (assoc cross :x x :y y)))

(defn update-state [state]
  (let [time (:time state 0)  ; Add time to state for orbital motion
        interaction (calculate-interaction (:cross1 state) (:cross2 state))
        orbit-radius 120  ; Base orbit radius
        
        ; Update cross1 position and properties
        cross1 (-> (:cross1 state)
                   ; Orbit clockwise
                   (update-cross-position (:canvas-x-center state) 
                                        (:canvas-y-center state)
                                        orbit-radius 
                                        time)
                   ; Rotation speed affected by proximity
                   (update :angle #(+ % (* 0.02 (:factor interaction))))
                   ; Size pulses more dramatically when closer
                   (assoc :cross-size (* (:base-size (:cross1 state))
                                       (+ 1 (* 0.4 (q/sin (* time 0.1))
                                             (:factor interaction)))))
                   ; Color shifts based on angle between crosses
                   (update :hue #(mod (+ % (* 2 (:factor interaction))) 360)))
        
        ; Update cross2 position and properties
        cross2 (-> (:cross2 state)
                   ; Orbit counter-clockwise
                   (update-cross-position (:canvas-x-center state) 
                                        (:canvas-y-center state)
                                        orbit-radius 
                                        (- time))
                   ; Opposite rotation, speed affected by proximity
                   (update :angle #(- % (* 0.015 (:factor interaction))))
                   ; Size pulses in opposite phase
                   (assoc :cross-size (* (:base-size (:cross2 state))
                                       (+ 1 (* 0.4 (q/cos (* time 0.1))
                                             (:factor interaction)))))
                   ; Complementary color shifts
                   (update :hue #(mod (+ % 180 (* 2 (:factor interaction))) 360)))]
    
    (-> state
        (assoc :cross1 cross1)
        (assoc :cross2 cross2)
        (update :time inc))))

(defn start []
  (q/defsketch Something
    :host "sketch"
    :title "Cross with circle"
    :setup setup
    :update update-state
    :draw draw-state
    :renderer :p2d
    :mouse-clicked menu/when-mouse-pressed
    :size [menu/w menu/h]
    :middleware [menu/show-frame-rate
                 m/fun-mode]))