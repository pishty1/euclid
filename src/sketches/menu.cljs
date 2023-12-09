(ns sketches.menu
  (:require [quil.core :as q]))

(defn draw-menu-item [x y h w c1 c2 c3]
  ;;  (q/stroke-weight 20)
  (q/fill c1 c2 c3)
  (q/rect x y w h))

; get total height of page - totoal height of menu items divide by 2  = starting y 
(defn generate-origin [number-of-menu-items height width page-height page-width]
  (let [diff-y (- page-height (* number-of-menu-items height))
        origin-y (/ diff-y 2)
        diff-x (- page-width width)
        origin-x (/ diff-x 2)]
    {:ox origin-x
     :oy origin-y}))

(defn gen-menu-items [is-mobile? page-height page-width]
  (let [height 100
        width (if is-mobile? (/ page-width 2) 300)
        number-of-menu-items 6
        origin (generate-origin number-of-menu-items height width page-height page-width)
        padding-top 0]
    (loop [index 0
           mrange (range number-of-menu-items)
           menu-list []]
      (if (seq mrange)
        (recur (inc index)
               (rest mrange)
               (conj menu-list {:label (str "index: " index)
                                :color1 (rand-int (rand-int 255))
                                :color2 (rand-int (rand-int 255))
                                :color3 (rand-int (rand-int 255))
                                :height height
                                :width width
                                :px  (:ox origin); lets start here and stack them down 
                                :py (+ padding-top (+ (:oy origin) (* index height)))}))
        menu-list))))

(defn create-menu [is-mobile? page-height page-width]
  {:padding 10
   :menu-list (gen-menu-items is-mobile? page-height page-width)})

(defn draw-menu [is-mobile? menu-list]
  (doseq [{:keys [px py height width color1 color2 color3]} (:menu-list menu-list)]
    (draw-menu-item
     px
     py
     height
     width
     color1
     color2
     color3)))


(comment)