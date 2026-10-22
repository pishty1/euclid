(ns sketches.flow
  (:require [quil.core :as q]
            [menu :as menu]
            [registry :as registry]
            [viewport :as viewport]
            [quil.middleware :as m]
            ["../rendering/origins.js" :as origins]))

;; Retain the first registry slot while replacing the former Prime Gardens sketch.
(defn setup []
  (q/frame-rate 30)
  {:origins (origins/create (.getElementById js/document "sketch"))})

(defn update-state [state]
  (let [width (.-innerWidth js/window) height (viewport/canvas-height)]
    (when (or (not= (q/width) width) (not= (q/height) height))
      (q/resize-sketch width height))
    (origins/frame (:origins state) width height (or (:menu-visible? state) @menu/menu-visible)))
  state)

(registry/def-sketch "Cellular Origins" '(181 160 223)
  {:host "sketch" :title "Cellular Origins" :setup setup :update update-state :draw identity
   :size [menu/w menu/h] :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
