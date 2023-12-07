(ns sketches.menu
  (:require [quil.core :as q]))

(defn mouse-pressed [state event]
  (q/rect 0 0 100 100)
  (q/fill 255 (rand-int 255) 0)
  (println "++++++++++ Mouse pressed at " (q/mouse-x) (q/mouse-y))
  state)

(defn mouse-released [state event]
;;   (q/background 255 255 255)
  (println "---------xxxxxx--------")
  (println state event)
  (q/no-fill)
  (println "Released at " (q/mouse-x) (q/mouse-y))
  state)