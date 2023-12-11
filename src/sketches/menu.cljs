(ns sketches.menu
  (:require [quil.core :as q]
            [cljs.core.async :refer [go <! >!]]
            [sketches.channels :as ch]))

(defn draw-menu-item [x y h w c1 c2 c3]
  ;;  (q/stroke-weight 20)
  (q/fill c1 c2 c3)
  (q/rect x y w h))

(defn draw-burger-icon []
  (q/stroke 10)
  (q/fill 220 120 102)
  (q/rect 0 0 80 50))

(defn inside? [mousex mousey fromx fromy tox toy]
  (and (<= fromx mousex tox)
       (<= fromy mousey toy)))

(defn inside-burger? []
  (inside? (q/mouse-x) (q/mouse-y) 0 0 80 50))

(defn inside-menu? [{:keys [fromx fromy tox toy]}]
  (inside? (q/mouse-x) (q/mouse-y) fromx fromy tox toy))

(defn when-mouse-pressed [state]
  (when (and
       (:menu-visible? state)
       (inside-menu? (:dimentions (:menu state))))
    (let [selected (some #(when (inside?
                                 (q/mouse-x) (q/mouse-y)
                                 (:px %) (:py %)
                                 (+ (:px %) (:width %))
                                 (+ (:py %) (:height %)))
                            %)
                         (:items (:menu state)))]
      (go (>! ch/my-channel selected))))

  (assoc state
         :menu-visible? (and (inside-burger?)
                             (not (:menu-visible? state)))))


; get total height of page - totoal height of menu items divide by 2  = starting y 
(defn origin [number-of-menu-items height width page-height page-width]
  (let [diff-y (- page-height (* number-of-menu-items height))
        diff-x (- page-width width)
        origin-y (/ diff-y 2)
        origin-x (/ diff-x 2)]
    {:ox origin-x
     :oy origin-y}))


(defn gen-menu-items [items origin width height]
  (let [padding-top 0]
    (loop [index 0
           mrange items
           items []]
      (if (seq mrange)
        (recur (inc index)
               (rest mrange)
               (conj items
                     {:index index
                      :label (:name (first mrange))
                      :start-fn (:start (first mrange))
                      :color1 (rand-int (rand-int 255))
                      :color2 (rand-int (rand-int 255))
                      :color3 (rand-int (rand-int 255))
                      :height height
                      :width width
                      :px (:ox origin); lets start here and stack them down 
                      :py (+ padding-top (+ (:oy origin) (* index height)))}))
        items))))

(def showcase [{:name "flow"
                :start 'flow/start}
               {:name "tut1"
                :start 'tut1/start}
               {:name "tut2"
                :start 'tut2/start}
               {:name "tut3"
                :start 'tut3/start}
               {:name "tut4"
                :start 'tut4/start}])

(defn init-menu [mobile? page-height page-width]
  (let [width (if mobile? (/ page-width 2) 300)
        height 100
        number (count showcase)
        origin (origin number height width page-height page-width)]
    {:number number
     :width width
     :height height
     :origin origin
     :dimentions {:tox (+ (:ox origin) width)
                  :toy (* (:oy origin) number)
                  :fromx (:ox origin)
                  :fromy (:oy origin)}
     :items (gen-menu-items showcase origin width height)}))

(defn draw-menu [items]
  (doseq [{:keys [px py height width color1 color2 color3]} (:items items)]
    (draw-menu-item
     px
     py
     height
     width
     color1
     color2
     color3)))


(comment
) 