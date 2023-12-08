(ns sketches.menu
  (:require [quil.core :as q]))

(defn draw-menu-item [x y c1 c2 c3]
  (q/fill c1 c2 c3)
  (q/rect x y 100 100))

(def menu-items
  {:padding 10
   :menu-list [{:label "Hello"
                :color 255}
               {:label "World"
                :color 155}]})

(defn draw-menu [is-mobile?]
  (let [distance (if is-mobile? 300 500)
        increments (if is-mobile? 70 100)]
    (loop [index 1
           menu-list (:menu-list menu-items)]

      (when (seq menu-list)
        (let [item (first menu-list)
              {:keys [label color]} item
              new-x increments
              new-y (* index increments)]
          (draw-menu-item new-x new-y color color color)
          (recur (inc index) (rest menu-list)))))))


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

  (myloop)
  )