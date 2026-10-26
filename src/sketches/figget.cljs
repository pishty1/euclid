(ns sketches.figget
  (:require [quil.core :as q] [menu :as menu] [registry :as registry]
            [viewport :as viewport] [quil.middleware :as m]
            ["./figget_game.js" :as game]))

(defn setup []
  (q/resize-sketch (.-innerWidth js/window) (viewport/canvas-height))
  (q/frame-rate 30)
  (q/pixel-density 1)
  (game/setup)
  {})

(defn update-state [state]
  (game/update (boolean (:menu-visible? state)))
  (let [w (.-innerWidth js/window) h (viewport/canvas-height)]
    (when (or (not= w (q/width)) (not= h (q/height)))
      (q/resize-sketch w h)))
  state)

(defn draw-state [_]
  (when-let [canvas (.querySelector js/document "#sketch canvas")]
    (game/draw (.getContext canvas "2d") (q/width) (q/height))))

(defn mouse-clicked [state]
  (when-not (or (:menu-visible? state) (menu/inside-burger?))
    (game/click (q/mouse-x) (q/mouse-y) (q/width) (q/height)))
  state)

(defn key-pressed [state event]
  (when-not (:menu-visible? state)
    (game/keypress (case (:key event)
                    :up "ArrowUp" :down "ArrowDown" :left "ArrowLeft" :right "ArrowRight"
                    (name (:key event)))))
  state)

(registry/def-sketch "Figget-A-Balls" '(86 219 137)
  {:host "sketch" :title "The quiet atlas" :setup setup :update update-state :draw draw-state
   :renderer :p2d :key-pressed key-pressed :mouse-clicked mouse-clicked :size [menu/w menu/h]
   :middleware [menu/show-frame-rate m/fun-mode]})
