(ns sketches.menu
  (:require [quil.core :as q]))

(defn printlick []
  (dorun
   (println "Clicked at " (q/mouse-x) (q/mouse-y))))