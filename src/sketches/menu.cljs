(ns sketches.menu
  (:require [quil.core :as q]))

(defn draw-menu-item [x y c1 c2 c3]
  (q/fill c1 c2 c3)
  (q/rect x y 100 100))



(defn draw-menu []
  (q/with-translation [0 0]
    (doseq [x (range (q/mouse-x) (+ (q/mouse-x) 500) 100)
            y (range (q/mouse-y) (+ (q/mouse-y) 500) 100)]
      (draw-menu-item x y 255 255 0))))