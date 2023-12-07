(ns sketches.entry
  (:require [sketches.flow :as flow]
            [sketches.tut1 :as tut1]
            [sketches.tut2 :as tut2]
            [sketches.tut3 :as tut3]
            [sketches.tut4 :as tut4]
            ))


(def body (.-body js/document))
(def w (.-clientWidth body))
(def h (.-clientHeight body))

(defn prevent-behavior [e]
  (.preventDefault e))

(.addEventListener js/document "touchmove" prevent-behavior #js {:passive false})
;; document.addEventListener('contextmenu', event => event.preventDefault());
(.addEventListener js/document "contextmenu" prevent-behavior #js {:passive false})

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

(defn randomizer []
  (if (> (rand-int 10) 10)
    (flow/start)
    (tut1/start)))

(comment
  (chooser 1)

  )