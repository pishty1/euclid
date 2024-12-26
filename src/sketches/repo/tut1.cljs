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
  
  ; Draw multiple layers with more subtle colors
  (doseq [i (range 12)]  ; More layers for smoother fade
    (let [size (* cross-size (- 1 (* i 0.08)))  ; Even slower size reduction
          base-opacity (- 80 (* i 6))  ; Lower max opacity, gentler falloff
          ; Smaller hue shifts for more cohesive look
          layer-hue (mod (+ hue (* i 2)) 360)
          ; Lower saturation for pastel effect
          saturation (if (even? i) 40 30)]
      (q/stroke layer-hue saturation 85 base-opacity)
      (q/fill layer-hue saturation 75 (/ base-opacity 4))
      (q/stroke-weight (- 3 (* i 0.15)))  ; Thinner strokes
      (q/begin-shape)
      (q/vertex (- size) (- size))
      (q/vertex size size)
      (q/end-shape)
      (q/begin-shape)
      (q/vertex size (- size))
      (q/vertex (- size) size)
      (q/end-shape)))
  
  (q/pop-matrix))

(defn draw-state [{:keys [cross1 cross2 canvas-x-center canvas-y-center circ-size time]}]
  (q/color-mode :hsb 360 100 100 100)
  (let [bg-hue (mod (* time 0.1) 360)]  ; Slower background color shift
    ; More transparent, subtle background
    (q/fill bg-hue 10 20 15)  ; Lower saturation and brightness
    (q/no-stroke)
    (q/rect 0 0 (q/width) (q/height)))
  
  (q/stroke-weight 2)  ; Thinner strokes overall
  
  ; Draw crosses
  (draw-cross cross1)
  (draw-cross cross2)
  
  ; Subtler center circle
  (let [circle-hue (mod (+ (:hue cross1) (:hue cross2)) 360)]
    (q/fill circle-hue 30 80 100)
    (q/no-stroke)
    (q/ellipse canvas-x-center canvas-y-center circ-size circ-size)))

(defn calculate-interaction [cross1 cross2]
  (let [dx (- (:x cross2) (:x cross1))
        dy (- (:y cross2) (:y cross1))
        distance (Math/sqrt (+ (* dx dx) (* dy dy)))
        angle (Math/atan2 dy dx)
        interaction-factor (/ 200 (+ distance 100))]  ; Even smoother falloff
    {:distance distance
     :angle angle
     :factor interaction-factor}))

(defn update-cross-position [cross center-x center-y orbit-radius time]
  (let [orbit-speed 0.005  ; Slower orbital motion
        x (+ center-x (* orbit-radius (Math/cos (* time orbit-speed))))
        y (+ center-y (* orbit-radius (Math/sin (* time orbit-speed))))]
    (assoc cross :x x :y y)))

(defn update-state [state]
  (let [time (:time state 0)
        interaction (calculate-interaction (:cross1 state) (:cross2 state))
        orbit-radius 150  ; Larger orbit for gentler motion
        
        ; Update cross1
        cross1 (-> (:cross1 state)
                   (update-cross-position (:canvas-x-center state) 
                                        (:canvas-y-center state)
                                        orbit-radius 
                                        time)
                   ; Slower rotation
                   (update :angle #(+ % (* 0.01 (:factor interaction))))
                   ; Gentler size pulsing
                   (assoc :cross-size (* (:base-size (:cross1 state))
                                       (+ 1 (* 0.2 (q/sin (* time 0.05))
                                             (:factor interaction)))))
                   ; Slower color shifts
                   (update :hue #(mod (+ % (* 0.5 (:factor interaction))) 360)))
        
        ; Update cross2
        cross2 (-> (:cross2 state)
                   (update-cross-position (:canvas-x-center state) 
                                        (:canvas-y-center state)
                                        orbit-radius 
                                        (- time))
                   ; Slower rotation
                   (update :angle #(- % (* 0.008 (:factor interaction))))
                   ; Gentler size pulsing
                   (assoc :cross-size (* (:base-size (:cross2 state))
                                       (+ 1 (* 0.2 (q/cos (* time 0.05))
                                             (:factor interaction)))))
                   ; Slower complementary color shifts
                   (update :hue #(mod (+ % 180 (* 0.5 (:factor interaction))) 360)))]
    
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