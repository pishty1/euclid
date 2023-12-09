(ns sketches.menu
  (:require [quil.core :as q]))

(defn draw-menu-item [x y h w c1 c2 c3]
  ;;  (q/stroke-weight 20)
  (q/fill c1 c2 c3)
  (q/rect x y w h))

(defn draw-burger-icon []
  (q/stroke 10)
  (q/fill 220 120 102)
  (q/rect 0 0 80 50))

(defn inside-burger? []
  (let [mouse-x (q/mouse-x)
        mouse-y (q/mouse-y)]
    (and (<= 0 mouse-x 80)
         (<= 0 mouse-y 50))))

(defn inside-menu? [{:keys [fromx fromy tox toy]}]
  (and (<= fromx (q/mouse-x) tox)
       (<= fromy (q/mouse-y) toy)))

(defn when-mouse-pressed [state]
  (if (and 
       (inside-menu? (:dimentions (:menu state)))
       (:menu-visible? state))
    (println "clicked on menu")
    (println "clicked off menu"))

  (assoc state
         :menu-visible? (and (inside-burger?)
                             (not (:menu-visible? state)))))


; get total height of page - totoal height of menu items divide by 2  = starting y 
(defn generate-origin [number-of-menu-items height width page-height page-width]
  (let [diff-y (- page-height (* number-of-menu-items height))
        diff-x (- page-width width)
        origin-y (/ diff-y 2)
        origin-x (/ diff-x 2)]
    {:ox origin-x
     :oy origin-y}))


(defn gen-menu-items [origin width height number]
  (let [padding-top 0]
    (loop [index 0
           mrange (range number)
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
                                :px (:ox origin); lets start here and stack them down 
                                :py (+ padding-top (+ (:oy origin) (* index height)))}))
        menu-list))))

(defn create-menu-details [mobile? page-height page-width]
  (let [width (if mobile? (/ page-width 2) 300)
        height 100
        number 4
        origin (generate-origin number height width page-height page-width)]
    {:number number
     :width width 
     :height height
     :origin origin
     :dimentions {:tox (+ (:ox origin) width)
                  :toy (* (:oy origin) number)
                  :fromx (:ox origin)
                  :fromy (:oy origin)}
     :menu-list (gen-menu-items origin width height number)}))

(defn draw-menu [mobile? menu-list]
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