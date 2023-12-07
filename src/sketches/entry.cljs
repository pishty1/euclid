(ns sketches.entry
  (:require [sketches.flow :as flow]
            [sketches.tut1 :as tut1]
            [sketches.tut2 :as tut2]
            [sketches.tut3 :as tut3]
            [sketches.tut4 :as tut4]
            ))


(defonce sketchy
  (tut1/start))

;; (defonce sketchy
;;   (if (< (rand-int 10) 5)
;;     (tut1/gen-art-1)
;;     (flow/startup)))

(defn chooser [x]
  (case x
    0 (flow/start)
    1 (tut1/start)
    2 (tut2/start)
    3 (tut3/start)
    4 (tut4/start)
    ))
(comment
  (chooser 2) 

  (defn randomizer []
    (if (< (rand-int 10) 5)
      (println "Less than 5")
      (println "Greater than 5"))))