(ns sketches.tut1
  (:require
   [quil.core :as q]
   [sketches.menu :as menu]
   [quil.middleware :as m]))

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
(def body (.-body js/document))
(def w (.-clientWidth body))
(def h (.-clientHeight body))

(defn prevent-behavior [e]
  (.preventDefault e))

(.addEventListener js/document "touchmove" prevent-behavior #js {:passive false})
;; (.addEventListener js/document "contextmenu" prevent-behavior #js {:passive false})
;; (set! (.-disabled (.getElementById js/document "myapp")) true)

(defn is-mobile-browser? []
  (let [user-agent (or (.-userAgent js/navigator)
                       (.-vendor js/navigator)
                       (.-opera js/window))]
    (boolean (re-find #"(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini)" user-agent))))

(defn setup []
  (q/smooth)
  (q/background 230 230 230)
  (q/stroke 130, 0 0)
  (q/stroke-weight 4)
  (let [cross-size      70
        circ-size       50
        canvas-x-center (/ (q/width) 2)
        canvas-y-center (/ (q/height) 2)
        left            (- canvas-x-center cross-size)
        right           (+ canvas-x-center cross-size)
        top             (+ canvas-y-center cross-size)
        bottom          (- canvas-y-center cross-size)
        is-mobile (is-mobile-browser?)]
    (println "is mobile :" is-mobile)

    {:menu (menu/create-menu is-mobile h w)
     :is-mobile is-mobile :circ-size circ-size
     :canvas-x-center canvas-x-center :canvas-y-center canvas-y-center
     :left left :right right :top top :bottom bottom}))

(defn draw-state [{:keys [menu is-mobile left right top bottom
                          canvas-x-center canvas-y-center circ-size]}]

  (q/background 230 230 230)

  (q/stroke 130, 0 0)
  (q/stroke-weight 4)

  (q/line left bottom right top)
  (q/line right bottom left top)
  (q/fill (if is-mobile 255 0) 150)
  (q/ellipse canvas-x-center canvas-y-center circ-size circ-size)
  (when (q/mouse-pressed?)
    (menu/draw-menu is-mobile menu)))


(defn update-state [state]
  (assoc state 
         :left (q/mouse-x)
         :right (q/mouse-y)))


(defn start []
  (println "version 0.0.6")
  (q/sketch
   :host "sketch"
   :title "Cross with circle"
   :setup setup
   :update update-state
   :draw draw-state
   :size [w h]
   :renderer :p2d
   :middleware [m/fun-mode]))