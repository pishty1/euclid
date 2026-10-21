(ns sketches.cross
  (:require [quil.core :as q]
            [menu :as menu]
            [registry :as registry]
            [viewport :as viewport]
            [quil.middleware :as m]
            ["../rendering/garden.js" :as garden]))

;; Keep the registry slot so existing sketch indices retain their meaning.
(defn setup []
  (q/frame-rate 30)
  {:garden (garden/create (.getElementById js/document "sketch"))})

(defn update-state [state]
  (let [width (.-innerWidth js/window) height (viewport/canvas-height)]
    (when (or (not= (q/width) width) (not= (q/height) height))
      (q/resize-sketch width height))
    (garden/frame (:garden state) width height (or (:menu-visible? state) @menu/menu-visible)))
  state)

(registry/def-sketch "Emergence Garden" '(181 215 135)
  {:host "sketch" :title "Emergence Garden" :setup setup :update update-state :draw identity
   :size [menu/w menu/h] :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
