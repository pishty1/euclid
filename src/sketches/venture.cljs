(ns sketches.venture
  (:require [quil.core :as q :include-macros true]
            [quil.middleware :as m]
            [registry :as registry]
            [menu :as menu]))

(declare on-screen?)

;; By Erik Svedäng, Nov 2014

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Utility Functions
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; Creates a smooth oscillating value between low and high values at the given rate
;; low: minimum value
;; high: maximum value  
;; rate: how many seconds for one complete oscillation
;; Returns: A value that smoothly oscillates between low and high using a sine wave
(defn pulse [low high rate]
  (let [diff  (- high low)        ; Calculate total range
        half  (/ diff 2)          ; Get half the range
        mid   (+ low half)        ; Find midpoint
        s     (/ (q/millis) 1000.0) ; Convert milliseconds to seconds
        x     (q/sin (* s (/ 1.0 rate)))] ; Sine wave oscillation
    (+ mid (* x half))))          ; Scale sine wave to range and offset to midpoint

(defn rand-between [low high]
  (let [diff (- high low)]
    (+ low (rand diff))))

(defn rand-coord [size]
  [(rand-between (- size) size)
   (rand-between (- size) size)])

(defn translate-v2 [[x y] [dx dy]]
  [(+ x dx) (+ y dy)])

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Ship Entity: Rendering and Creation
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn render-ship [ship]
  (q/fill 50 80 50)
  (q/rect -2 0 5 14)
  (q/fill 150 180 150)
  (q/triangle 0 -10 25 0 0 10)
  (q/fill 30 100 30)
  (q/ellipse 8 0 8 8))

(defn create-ship []
  {:pos       [(/ menu/w 2) (- menu/h 100)]  ;; Center horizontally, 100 pixels from bottom
   :dir       (- (/ q/PI 2))                 ;; Point upward
   :dir-change 0
   :speed     5                             ;; Constant speed
   :z         1.0
   :render-fn render-ship})

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Star Entity: Rendering and Creation
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn render-star [star]
  (let [size (:size star)]
    (q/fill 255)
    (q/rect 0 0 size size)))

(defn create-star [pos]
  {:pos       pos
   ;;  :dir (rand q/TWO-PI) ; Alternative random direction if needed
   :dir       0.3 ; Approximately PI + 0.2 to move downward
   :size      (+ 1.0 (rand 3.0))
   :z         (rand-between 0.2 0.7)
   :render-fn render-star})

(defn random-star []
  (create-star (rand-coord 1400)))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Planet Entity: Rendering and Creation
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn render-planet [planet]
  (let [size    (:size planet)
        [r g b] (:color planet)]
    (q/fill r g b)
    (let [rs   (:rs planet)
          step (/ q/TWO-PI (count rs))]
      (q/begin-shape)
      (doseq [[angle radius] (map vector (range 0 q/TWO-PI step) rs)]
        (q/vertex (* size radius (q/cos angle))
                  (* size radius (q/sin angle))))
      (q/end-shape))))

(defn generate-radiuses []
  (into [] (take (+ 5 (rand-int 7))
                 (repeatedly #(rand-between 0.5 1.0)))))
(defn create-planet [pos color]
  (let [[x y] pos]
    (.log js/console (str "Creating planet at position [x: " x ", y: " y "]"))
    (let [planet {:pos        pos
                  :dir        (rand q/TWO-PI)
                  :dir-change (rand-between -0.01 0.01)
                  :size       (+ 50.0 (rand 50.0))
                  :drift      [(rand-between -0.3 0.3) (rand-between -0.3 0.3)]
                  :color      color
                  :z          1.0
                  :rs         (generate-radiuses)
                  :render-fn  render-planet}]
      (.log js/console (str "Planet created with position [x: " x ", y: " y "]"))
      planet)))

(defn random-planet []
  (.log js/console "Generating random planet...")
  (let [pos [(rand-between (- menu/w) menu/w) -100] ; Position at top of screen with random x
        [x y] pos
        color [(rand-between 0 255)
               (rand-between 50 150)
               (rand-between 50 150)]]
    (.log js/console (str "Random planet position [x: " x ", y: " y "]"))
    (create-planet pos color)))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Setup and State Update Functions
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn setup []
  (q/rect-mode :center)
  (q/frame-rate 30)
  {:rect-mode :center
   :ship     (create-ship)
   :stars    (take 3000 (repeatedly random-star))
   :planets  [(random-planet)]
   :planet-spawn-timer 1.0
   :planet-spawn-interval 5.0})

(defn auto-rotate [entity]
  (update-in entity [:dir] #(+ % (:dir-change entity))))

(defn drift-planet [planet]
  (update-in planet [:pos] translate-v2 (:drift planet)))

(defn update-state [state]
  (let [time-step 0.033
        new-timer (+ (:planet-spawn-timer state) time-step)
        t (/ (q/millis) 1000.0)
        scroll-y (* t -100)
        cam-pos [0 scroll-y]
        current-planets (filter (fn [planet]
                                  (let [[x y] (:pos planet)
                                        screen-x (- x (* (:z planet) (first cam-pos)))
                                        screen-y (- y (* (:z planet) (second cam-pos)))]
                                    (on-screen? screen-x screen-y)))
                                (:planets state))
        updated-state (-> state
                          (update-in [:planets] #(map auto-rotate %))
                          (update-in [:planets] #(map drift-planet %))
                          (assoc :planets current-planets)
                          (assoc :planet-spawn-timer new-timer))]
    (if (or (empty? current-planets)
            (>= new-timer (:planet-spawn-interval updated-state)))
      (-> updated-state
          (update :planets conj (random-planet))
          (assoc :planet-spawn-timer 0.0)
          (update :planet-spawn-interval #(max (- % 0.2) 1.0)))
      updated-state)))

;; Determines if a point is visible on screen with a margin
;; x: x-coordinate to check
;; y: y-coordinate to check
;; Returns: true if the point is within the screen bounds plus margin, false otherwise
;; The margin of 100 pixels allows entities slightly off-screen to still be rendered,
;; preventing sudden pop-in/pop-out effects at screen edges
(defn on-screen? [x y]
  (let [margin 100]
    (and (<= (- margin) x (+ margin (q/width)))
         (<= (- margin) y (+ margin (q/height))))))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Rendering Functions
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn draw-entity [entity [cam-x cam-y]]
  (let [[x y]     (:pos entity)
        dir       (:dir entity)
        z         (:z entity)
        render-fn (:render-fn entity)
        screen-x  (- x (* z cam-x))
        screen-y  (- y (* z cam-y))]
    (when (on-screen? screen-x screen-y)
      (q/push-matrix)
      (q/translate screen-x screen-y)
      (q/rotate dir)
      (render-fn entity)
      (q/pop-matrix))))

(defn draw-state [state]
  ;; Creates a dynamic background color that smoothly pulses between values:
  ;; Red channel: Pulses between 20-40 over 15 seconds
  ;; Green channel: Pulses between 40-60 over 40 seconds  
  ;; Blue channel: Pulses between 50-70 over 5 seconds
  ;; This creates a subtle, shifting background color effect
  (q/background (pulse 20 40 15.0)  ; Red component
                (pulse 40 60 40.0)  ; Green component 
                (pulse 50 70 5.0))  ; Blue component
  (q/no-stroke)
  (let [time     (/ (q/millis) 1000.0)
        scroll-y (* time -100)  ;; Scroll speed
        cam-pos  [0 scroll-y]]
    (doseq [star (:stars state)]
      (draw-entity star cam-pos))
    (doseq [planet (:planets state)]
      (draw-entity planet cam-pos))
    (draw-entity (:ship state) [0 0])))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Main Sketch Entry Point
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(registry/def-sketch "Ad Venture" '(120 0 100)
  {:host          "sketch"
   :setup         setup
   :update        update-state
   :draw          draw-state
   :mouse-clicked menu/when-mouse-pressed
   :size          [menu/w menu/h]
   :middleware    [menu/show-frame-rate
                   m/fun-mode]})
