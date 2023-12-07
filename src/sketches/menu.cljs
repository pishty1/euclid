(ns sketches.menu
  (:require [quil.core :as q]))

(defn draw-box []
  (q/fill 255 255 0)
  (q/rect 0 0 100 100)
  (println "++++++++++ PRESSED at " (q/mouse-x) (q/mouse-y)))

(defn mouse-pressed [state event]
  (draw-box)
  state)

(defn mouse-released [state event]
;;   (q/background 255 255 255)
  (println "---------RELEASED--------")
  (println state event)
;;   (q/no-fill)
  (println "Released at " (q/mouse-x) (q/mouse-y))
  state)