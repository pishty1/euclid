(ns entry
  (:require [manifest]
            [menu :as menu]
            [registry :as registry]
            [quil.core :as q]))


(defn prevent-behavior [e]
  (when-let [canvas-host (.getElementById js/document "sketch")]
    (when (.contains canvas-host (.-target e))
      (.preventDefault e))))

(.addEventListener js/document "touchmove" prevent-behavior #js {:passive false})
;; document.addEventListener('contextmenu', event => event.preventDefault());
(.addEventListener js/document "contextmenu" prevent-behavior #js {:passive false})

(defonce current-sketch (atom nil))

(defn clear-sketch []
  (when-let [sketch @current-sketch]
    (.remove sketch)
    (reset! current-sketch nil))
  (let [node (.getElementById js/document "sketch")]
    (when node
      (set! (.-innerHTML node) ""))))

(defn chooser
  ([]
   (chooser @menu/selected-sketch))
  ([x]
   (clear-sketch)
   (if-let [sketch (registry/get-sketch x)]
     (reset! current-sketch ((:start sketch)))
     (println x ": unknown sketch index"))))

(defn init []
  (add-watch menu/selected-sketch :switcher
             (fn [_key _atom _old-state new-state]
               (chooser new-state))))

(init)
