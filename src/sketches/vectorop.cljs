(ns sketches.vectorop)

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