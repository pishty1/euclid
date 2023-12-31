(ns sketches.repo.flow
  (:require [quil.core :as q :include-macros true]
            [sketches.menu :as menu]
            [quil.middleware :as m]))

;; (def body (.-body js/document))
;; (def w (.-clientWidth body))
;; (def h (.-clientHeight body))

;; (defn prevent-behavior [e]
;;   (.preventDefault e))

;; (.addEventListener js/document "touchmove" prevent-behavior #js {:passive false})
;; ;; document.addEventListener('contextmenu', event => event.preventDefault());
;; (.addEventListener js/document "contextmenu" prevent-behavior #js {:passive false})

(def noise-zoom
  "Noise zoom level."
  0.045)

(defn add [x y]
  (+ x y))

(def palette
  {:name       "purple haze"
   :background [10 10 10]
   :colors     [[32 0 40]
                [82 15 125]
                [99 53 126]
                [102 10 150]
                [132 26 200]
                [165 32 250]
                [196 106 251]]})


(defn particle
  "Creates a particle map."
  [id]
  {:id        id
   :vx        1
   :vy        1
   :size      3
   :direction 0
   :x         (q/random menu/w)
   :y         (q/random menu/h)
   :color     (rand-nth (:colors palette))})


(defn sketch-setup
  "Returns the initial state to use for the update-render loop."
  []
  (apply q/background (:background palette))
  {:particles (map particle (range 0 2000))})


(defn position
  "Calculates the next position based on the current, the speed and a max."
  [current delta max]
  (mod (+ current delta) max))


(defn velocity
  "Calculates the next velocity by averaging the current velocity and the added delta."
  [current delta]
  (/ (+ current delta) 2))


(defn direction
  "Calculates the next direction based on the previous position and id of each particle."
  [x y z]
  (* 2
     Math/PI
     (+ (q/noise (* x noise-zoom) (* y noise-zoom))
        (* 0.12 (q/noise (* x noise-zoom) (* y noise-zoom) (* z noise-zoom))))))


(defn sketch-update
  "Returns the next state to render. Receives the current state as a paramter."
  [{:keys [particles] :as state}]
  (assoc state :particles (map (fn [p]
                                 (assoc p
                                        :mx        100
                                        :x         (position (:x p) (:vx p) menu/w)
                                        :y         (position (:y p) (:vy p) menu/h)
                                        :direction (direction (:x p) (:y p) (:id p))
                                        :vx        (velocity (:vx p) (Math/cos (:direction p)))
                                        :vy        (velocity (:vy p) (Math/sin (:direction p)))))
                               particles)))


(defn sketch-draw
  "Draws the current state to the canvas. Called on each iteration after sketch-update."
  [{:keys [particles]}]
  (q/no-stroke)
  (doseq [p particles]
    (apply q/fill (conj (:color p) 5))
    (q/ellipse (:x p) (:y p) (:size p) (:size p))))


(defn start []
  (println "version 0.0.4")
  (q/defsketch Koto
    :host "sketch"
    :size [menu/w menu/h]
    :setup sketch-setup
    :draw sketch-draw
    :update sketch-update
    :mouse-clicked menu/when-mouse-pressed
    :middleware [menu/show-frame-rate
                 m/fun-mode]
    :settings (fn []
                (q/pixel-density 1)
                (q/random-seed 666)
                (q/noise-seed 666))))