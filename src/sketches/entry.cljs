(ns sketches.entry
  (:require [sketches.flow :as flow]
            [sketches.tut1 :as tut1]
            [sketches.tut2 :as tut2]
            [sketches.tut3 :as tut3]
            [sketches.tut4 :as tut4]
            [sketches.channels :as ch]
            [cljs.core.async :refer [go-loop <!]]))


(defn prevent-behavior [e]
  (.preventDefault e))

(.addEventListener js/document "touchmove" prevent-behavior #js {:passive false})
;; document.addEventListener('contextmenu', event => event.preventDefault());
(.addEventListener js/document "contextmenu" prevent-behavior #js {:passive false})

(defn chooser
  ([]
   (tut1/start))
  ([x]
   (case x
     0 (flow/start)
     1 (tut1/start)
     2 (tut2/start)
     3 (tut3/start)
     4 (tut4/start)
     (println x ": unknown index"))))

(go-loop []
  (let [input (<! ch/my-channel)]
    (println "input: " (type (:start-fn input)))
    (chooser (:index input))
    ;; (resolve '(:start-fn input))
    )
  (recur))

(comment
  (chooser 2)
  )