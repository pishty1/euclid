(ns sketches.repo.tut5
  (:require
   [quil.core :as q]
   [sketches.menu :as menu]
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

(defn setup []
  (q/smooth)
  (q/background 230 230 230)
  (q/stroke 130, 0 0)
  (q/stroke-weight 4)
  (let [number-of-balls 100]
    {:balls (map (fn [_]
                   {:location [(rand-int (q/width)) (rand-int (q/height))]
                    :speed [(rand-int 2) (rand-int 2)]
                    :acc [0 0]
                    :stroke (list 0 0 100)
                    :fill  (list  0 0 255)
                    :mass (q/floor (+ 1 (rand-int 10)))})
                 (range number-of-balls))}))

(defn update-state [{:keys [balls] :as state}]
  (loop [myballs balls
         newballs []]
    (if (seq myballs)
      (let [ball (first myballs)
            location    (:location ball)
            speed       (:speed ball)
            mass       (:mass ball)
            direction (v/sub [(q/mouse-x) (q/mouse-y)] location)
            org-distance (v/mag direction)
            distance (if (< org-distance 5)
                       5
                       (if (> org-distance 25)
                         25
                         org-distance))
            magnitude (/ (* 1 mass 20) (* distance distance))
            norm-direction (v/norm direction)
            scaled-direction (v/mult norm-direction magnitude)
            updated-speed (v/add speed scaled-direction)
            limited-speed (v/limit updated-speed 10)
            updated-location (v/add location limited-speed)]
        (recur (rest myballs)
               (conj newballs (assoc ball
                                     :location updated-location
                                     :speed limited-speed
                                     :acc [0 0]
                                     :fill (list (* 10 org-distance) org-distance 255)
                                     :stroke (list (* 2 org-distance) (* 1 org-distance) 100)
                                     ))))
      (assoc state
             :balls newballs))))

(defn draw-state [{:keys [balls]}]
  (q/background 190 130 30)
  (q/stroke-weight 5)
  (doseq [ball balls]
    (q/stroke (first (:stroke ball))
              (second (:stroke ball))
              (last (:stroke ball)))
    (q/fill (first (:fill ball))
            (second (:fill ball))
            (last (:fill ball)))
    (q/ellipse (first (:location ball)) (second (:location ball)) 26 26))
  (let [center [(/ (q/width) 2)
                (/ (q/height) 2)]
        mouse [(q/mouse-x)
               (q/mouse-y)]
        diff (v/sub  mouse center)
        ;; scaled-diff (v/mult diff 0.8)
        scaled-diff-div (v/div diff 1)
        mag (v/mag scaled-diff-div)
        [finalx finaly] scaled-diff-div]))

(defn start []
  (q/defsketch Something2
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