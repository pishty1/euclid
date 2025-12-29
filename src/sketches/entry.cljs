(ns sketches.entry
  (:require [sketches.repo.flow :as flow]
            [sketches.repo.tut1 :as tut1]
            [sketches.repo.tut2 :as tut2]
            [sketches.repo.tut3 :as tut3]
            [sketches.repo.tut4 :as tut4]
            [sketches.repo.tut5 :as tut5]
            [sketches.repo.euclid :as euclid]
            [sketches.menu :as menu]
            [sketches.channels :as ch]
            [cljs.core.async :refer [go-loop <!]]
            [quil.core :as q]))


(defn prevent-behavior [e]
  (.preventDefault e))

(.addEventListener js/document "touchmove" prevent-behavior #js {:passive false})
;; document.addEventListener('contextmenu', event => event.preventDefault());
(.addEventListener js/document "contextmenu" prevent-behavior #js {:passive false})

(defn clear-sketch []
  (let [node (.getElementById js/document "sketch")]
    (when node
      (set! (.-innerHTML node) ""))))

(defn chooser
  ([]
   (chooser 0))
  ([x]
   (clear-sketch)
   (case x
     0 (flow/start)
     1 (tut1/start)
     2 (euclid/start)
     3 (tut5/start)
     4 (tut4/start)
     (println x ": unknown index"))))

(defonce app-state (atom {:running false}))

(defn init []
  (when-not (:running @app-state)
    (swap! app-state assoc :running true)
    (go-loop []
      (let [input (<! ch/my-channel)]
        (chooser (:index input)))
      (recur))))

(init)

(defn ^:dev/after-load start []
  (chooser))

(comment
  (chooser 2)
  (let [sym 'sketches.flow/start  ; The symbol you have
        fn (deref (resolve sym))] ; Resolve the symbol and dereference to get the function
    (fn))
  )