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

(defn setup []
  (q/smooth)
  (q/background 230 230 230)
  (q/stroke 130, 0 0)
  (q/stroke-weight 4)
  (let [number-of-balls 4]

    {:balls (map (fn [_]
                   {:location {:x (rand-int (q/width)) :y (rand-int (q/height))}
                    :speed {:x (rand-int 3) :y (rand-int 5)}
                    :stroke (list (rand-int 255) (rand-int 255) (rand-int 255))
                    :fill (list (rand-int 255) (rand-int 255) (rand-int 255))
                    })
                 (range number-of-balls))}))

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
    (q/ellipse (:x (:location ball)) (:y (:location ball)) 26 26))

  (let [center {:x (/ (q/width) 2)
                :y (/ (q/height) 2)}
        mouse {:x (q/mouse-x)
               :y (q/mouse-y)}
        diff (v/sub  [(:x mouse) (:y mouse)]
                     [(:x center) (:y center)])
        ;; scaled-diff (v/mult diff 0.8)
        scaled-diff-div (v/div diff 0.5)
        mag (v/mag scaled-diff-div)
        [finalx finaly] scaled-diff-div]
    (q/line (:x center) (:y center)
            (+ (:x center) finalx) (+ (:y center) finaly))

    (q/fill 0)
    (q/rect 0 0 mag, 10)
    ))


(defn update-state [{:keys [balls w h] :as state}]
  (loop [myballs balls
         newballs []]
    (if (seq myballs)
      (let [ball (first myballs)
            location    (:location ball)
            speed       (:speed ball)
            newlocation {:x (+ (:x location) (:x speed))
                         :y (+ (:y location) (:y speed))}
            newspeed    {:x (if (or (> (:x newlocation) w)
                                    (< (:x newlocation) 0))
                              (* (:x speed) -1)
                              (:x speed))
                         :y (if (or (> (:y newlocation) h)
                                    (< (:y newlocation) 0))
                              (* (:y speed) -1)
                              (:y speed))}]
        (recur (rest myballs)
               (conj newballs (assoc ball
                                     :location newlocation
                                     :speed newspeed))))
      (assoc state
             :balls newballs))))

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