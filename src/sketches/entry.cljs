(ns sketches.entry
  (:require [sketches.flow :as flow]
            [sketches.tut1 :as tut1]))

(defonce sketchy
  (if (< (rand-int 10) 5)
    (tut1/gen-art-1)
    (flow/startup)))

(comment
  (defn randomizer []
    (if (< (rand-int 10) 5)
      (println "Less than 5")
      (println "Greater than 5"))))