(ns sketches.repo.euclid
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
  {:mouse-pressed-position nil}
  )

(defn draw-state [state]

  (q/background 190 130 30)
  (q/stroke-weight 2)
  (when (:mouse-pressed-position state)
   (let [origin (:mouse-pressed-position state)
         line {:fromx (first origin) :fromy (second origin)
               :tox (q/mouse-x) :toy (q/mouse-y)}
         anchor-circle {:x (first origin) :y (second origin) :w 20 :h 20}
         current-mouse {:x (q/mouse-x) :y (q/mouse-y) :w 20 :h 20}
         diff (v/sub  [(:x current-mouse) (:y current-mouse)]
                      origin)
         mag (v/mag diff)
         rcircle {:x (:x anchor-circle) :y (:y anchor-circle) :w mag :h mag}]

     (q/line (:fromx line) (:fromy line)  (:tox line) (:toy line))
     (q/fill 255 150)
     (q/ellipse (:x anchor-circle) (:y anchor-circle) (:w anchor-circle) (:h anchor-circle))
     (q/ellipse (:x current-mouse) (:y current-mouse) (:w current-mouse) (:h current-mouse))
     (q/ellipse (:x rcircle) (:y rcircle) (:w rcircle) (:h rcircle))))

    )


(defn update-state [state]
  state)


(defn start []
  (q/defsketch Euclid
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