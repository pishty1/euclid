(ns sketches.repo.figget
  (:require
   [quil.core :as q]
   [sketches.menu :as menu]
   [sketches.registry :as registry]
   [quil.middleware :as m]
   [sketches.vectorop :as v]))

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

(defn bounce [location speed w h]
  [(if (or (> (first location) w)
           (< (first location) 0))
     (* (first speed) -1)
     (first speed))
   (if (or (> (second location) h)
           (< (second location) 0))
     (* (second speed) -1)
     (second speed))])

(defn wrap [location w h]
  [(if (> (first location) w)
     0
     (if (< (first location) 0)
       w
       (first location)))
   (if (> (second location) h)
     0
     (if (< (second location) 0)
       h
       (second location)))])

(defn boundries [location speed w h type]
  (case type
    :bounce (bounce location speed w h)
    :wrap (wrap location w h)
    (wrap location w h)))

(defn create-fire-particle [location]
  {:location location
   :velocity [(* (q/random-gaussian) 1.2)
              (- (* (q/random-gaussian) 1.4) 1.0)]
   :acceleration [0 0]
   :lifespan 255
   :mass 10
   :size (+ 10 (rand-int 20))})

(defn dead? [{:keys [lifespan]}]
  (< lifespan 0.0))

(defn update-fire-particle [{:keys [acceleration velocity location lifespan] :as particle}]
  (let [velocity (v/add velocity acceleration)]
    (assoc particle
           :velocity velocity
           :location (v/add velocity location)
           :lifespan (- lifespan 4.0)
           :acceleration [0 0])))

(defn display-fire-particle [{:keys [lifespan size] [x y] :location}]
  (q/color-mode :rgb)
  (q/fill (q/color 255 24 0 lifespan))
  (q/no-stroke)
  (let [particle-size (q/map-range lifespan 0 255 0 size)]
    (q/ellipse x y particle-size particle-size)))

(defn setup []
  (q/smooth)
  (q/background 230 230 230)
  (q/stroke 130, 0 0)
  (q/stroke-weight 4)
  (let [number-of-balls 100]
    {:black-ball {:location [(/ (q/width) 2) (/ (q/height) 2)]
                  :speed [0 0]
                  :acc [0 0]
                  :stroke (list 0 0 0)
                  :fill (list 0 0 0)
                  :mass 15}
     :balls (map (fn [_]
                   {:location [(rand-int (q/width)) (rand-int (q/height))]
                    :speed [(rand-int 2) (rand-int 2)]
                    :acc [0 0]
                    :stroke (list 0 0 100)
                    :fill  (list  0 0 255)
                    :mass (q/floor (+ 1 (rand-int 10)))
                    :max-speed (+ 5 (rand-int 15))
                    :on-fire false})
                 (range number-of-balls))
     :fire-particles []}))

(defn check-collision [ball black-ball]
  (let [distance (v/mag (v/sub (:location ball) (:location black-ball)))]
    (< distance 33))) ; Sum of radii (26/2 + 40/2)

(defn create-explosion [location]
  (repeatedly 40 #(create-fire-particle location)))

(defn update-state [{:keys [balls black-ball fire-particles] :as state}]
  (let [; First update black ball position based on mouse
        black-location (:location black-ball)
        black-speed (:speed black-ball)
        black-mass (:mass black-ball)
        mouse-direction (v/sub [(q/mouse-x) (q/mouse-y)] black-location)
        mouse-distance (max 5 (min 25 (v/mag mouse-direction)))
        mouse-magnitude (/ (* 1 black-mass 20) (* mouse-distance mouse-distance))
        mouse-force (v/mult (v/norm mouse-direction) mouse-magnitude)
        updated-black-speed (v/limit (v/add black-speed mouse-force) 10)
        updated-black-location (v/add black-location updated-black-speed)
        updated-black-ball (assoc black-ball
                                  :location updated-black-location
                                  :speed updated-black-speed)

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
                  norm-direction (v/norm mouse-dir)
                  mouse-force (v/mult norm-direction magnitude)
                  ; Black ball repulsion
                  black-dir (v/sub location updated-black-location)
                  black-distance (max 5 (v/mag black-dir))
                  black-magnitude (/ (* 2 mass black-mass 40) (* black-distance black-distance))
                  black-force (v/mult (v/norm black-dir) black-magnitude)
                  ; Combine forces
                  total-force (v/add mouse-force black-force)
                  updated-speed (v/add speed total-force)
                  limited-speed (v/limit updated-speed max-speed)
                  updated-location (v/add location limited-speed)]
              (recur (rest myballs)
                     (if colliding?
                       newballs  ; Remove colliding balls
                       (conj newballs (assoc ball
                                             :location updated-location
                                             :speed limited-speed
                                             :acc [0 0]
                                             :on-fire colliding?
                                             :fill (list (* 10 org-distance) org-distance 255)
                                             :stroke (list (* 2 org-distance) (* 1 org-distance) 100))))
                     new-explosions))
            [newballs explosions]))]
    (assoc state
           :black-ball updated-black-ball
           :balls updated-balls
           :fire-particles (concat updated-fire-particles new-explosions))))

(defn draw-state [{:keys [balls black-ball fire-particles]}]
  (q/background 190 130 30)

  ; Draw regular balls
  (q/stroke-weight 5)
  (doseq [ball balls]
    (q/stroke (first (:stroke ball))
              (second (:stroke ball))
              (last (:stroke ball)))
    (q/fill (first (:fill ball))
            (second (:fill ball))
            (last (:fill ball)))
    (q/ellipse (first (:location ball)) (second (:location ball)) 26 26))

  ; Draw fire particles
  (doseq [particle fire-particles]
    (display-fire-particle particle))

  ; Draw black ball
  (q/stroke (first (:stroke black-ball))
            (second (:stroke black-ball))
            (last (:stroke black-ball)))
  (q/fill (first (:fill black-ball))
          (second (:fill black-ball))
          (last (:fill black-ball)))
  (q/ellipse (first (:location black-ball))
             (second (:location black-ball))
             40 40)

  ; Draw ball count
  (q/fill 255)
  (q/stroke 0)
  (q/stroke-weight 2)
  (q/text-size 24)
  (q/text (str "Balls: " (count balls)) 20 40))

(registry/def-sketch "Figget-A-Balls" '(160 80 130)
  {:host "sketch"
   :title "Cross with circle"
   :setup setup
   :update update-state
   :draw draw-state
   :renderer :p2d
   :mouse-clicked menu/when-mouse-pressed
   :size [menu/w menu/h]
   :middleware [menu/show-frame-rate
                m/fun-mode]})