(ns sketches.euclid
  (:require
   [quil.core :as q]
   [menu :as menu]
   [registry :as registry]
   [quil.middleware :as m]
   [utils.vectorop :as v]))

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
  {:mouse-pressed-position nil
   :circles []
   :gravity 0.5})

(defn add-circle [state x y]
  (update state :circles conj
          {:pos [x y]
           :vel [0 0]
           :radius 20
           :bounce 0.7}))

(defn apply-gravity [circle]
  (update-in circle [:vel 1] + (:gravity circle)))

(defn apply-velocity [circle]
  (update circle :pos #(v/add % (:vel circle))))

(defn handle-boundary [circle]
  (let [[x y] (:pos circle)
        r (:radius circle)
        [vx vy] (:vel circle)
        bounce (:bounce circle)
        max-y (- menu/h r)]
    (if (> y max-y)
      (assoc circle
             :pos [x max-y]
             :vel [vx (* -1 vy bounce)])
      circle)))

(defn update-state [state]
  (if (:mouse-pressed-position state)
    state  ; Don't apply physics while drawing
    (update state :circles
            (fn [circles]
              (map (comp handle-boundary
                         apply-velocity
                         #(assoc % :gravity (:gravity state))
                         apply-gravity)
                   circles)))))

(defn draw-state [state]
  (q/background 190 130 30)
  (q/stroke-weight 2)

  ; Draw all circles with physics
  (doseq [circle (:circles state)]
    (let [[x y] (:pos circle)]
      (q/fill 255 150)
      (q/ellipse x y (* 2 (:radius circle)) (* 2 (:radius circle)))))

  ; Draw the interaction elements while mouse is pressed
  (when (:mouse-pressed-position state)
    (let [origin (:mouse-pressed-position state)
          line   {:fromx (first origin) :fromy (second origin)
                  :tox (q/mouse-x) :toy (q/mouse-y)}]
      (q/line (:fromx line) (:fromy line) (:tox line) (:toy line))
      (q/ellipse (first origin) (second origin) 40 40)
      (q/ellipse (q/mouse-x) (q/mouse-y) 40 40))))

(defn mouse-released [state event]
  (if (:mouse-pressed-position state)
    (-> state
        (add-circle (first (:mouse-pressed-position state))
                    (second (:mouse-pressed-position state)))
        (add-circle (:x event) (:y event))
        (assoc :mouse-pressed-position nil))
    state))

(registry/def-sketch "Euclid" '(160 100 100)
  {:host "sketch"
   :title "Gravity Circles"
   :setup setup
   :update update-state
   :draw draw-state
   :renderer :p2d
   :mouse-clicked menu/when-mouse-pressed
   :mouse-released mouse-released
   :size [menu/w menu/h]
   :middleware [menu/show-frame-rate
                m/fun-mode]})