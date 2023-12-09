(ns sketches.menu
   (:require [quil.core :as q]))

 (defn draw-menu-item [x y h w c1 c2 c3]
   (q/fill c1 c2 c3)
   (q/rect x y w h))


 (defn gen-menu-items []
   (let [myrange (range 7)
         height 100
         width 100]
     (loop [index 0
            mrange myrange
            menu-list []]
       (if (seq mrange)
         (recur (inc index)
                (rest mrange)
                (conj menu-list {:label (str "index: " index)
                                 :color (rand-int (rand-int 255))
                                 :height height
                                 :width width
                                 :px 100 ; lets start here and stack them down 
                                 :py (+ 100 (* index height))}))
         menu-list))))

 (def menu-item-list
   {:padding 10
    :menu-list (gen-menu-items)})

 (defn generate-menu [num]
   (map (fn [x] {:label (str "Item " x)
                 :color (rand-int (rand-int 255))})
        (range num)))

 (defn draw-menu [is-mobile?]
   (doseq [{:keys [px py height width color]} (:menu-list menu-item-list)]
     (draw-menu-item
      px
      py
      height
      width
      color
      color
      color)))


(comment
  ;; (def mycoll [1 2 3 4 5])
  (def mycoll
    {:toto "hello"
     :mycoll [1 2 3 4 5]})
  (defn myloop []
    (loop [index 0
           coll (:mycoll mycoll)
          ;;  {coll :mycoll} mycoll
           ]
      (when (seq coll)
        (println (first coll) " with index " index)
        (recur (inc index) (rest coll)))))

  (myloop))