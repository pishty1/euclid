(ns sketches.figget
  (:require [quil.core :as q] [menu :as menu] [registry :as registry]
            [viewport :as viewport] [quil.middleware :as m]
            ["../rendering/figget_life.js" :as world]))

(defn setup []
  (q/frame-rate 30)
  {:world (world/create (.getElementById js/document "sketch"))})

(defn update-state [state]
  (let [w (.-innerWidth js/window) h (viewport/canvas-height)]
    (when (or (not= w (q/width)) (not= h (q/height)))
      (q/resize-sketch w h))
    (world/frame (:world state) w h (or (:menu-visible? state) @menu/menu-visible)))
  state)

(registry/def-sketch "Figget-A-Balls" '(86 219 137)
  {:host "sketch" :title "The living frontier" :setup setup :update update-state :draw identity
   :size [menu/w menu/h] :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
