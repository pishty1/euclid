(ns sketches.vectorop)

(defn add [[x1 y1] [x2 y2]]
  [(+ x1 x2)
   (+ y1 y2)])

  (defn sub [[x1 y1] [x2 y2]]
    [(- x1 x2)
     (- y1 y2)])

  (defn mult [[x y] scalar]
    [(* x scalar)
     (* y scalar)])

  (defn div [[x y] scalar]
    [(/ x scalar)
     (/ y scalar)])

  (defn mag [[x y]]
    (Math/sqrt (+ (* x x) (* y y))))

  (defn norm [[x y]]
    (div [x y]
         (mag [x y])))

  (defn rand2d []
    (let [randx (- (* 2 (rand)) 1)
          randy (- (* 2 (rand)) 1)]
      [randx randy]))

(defn limit [[x y] limit]
  (let [mag (mag [x y])]
    (if (> mag limit)
      (mult (norm [x y]) limit)
      [x y])))