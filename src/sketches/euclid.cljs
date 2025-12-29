(ns sketches.euclid
  (:require
   [quil.core :as q]
   [menu :as menu]
   [registry :as registry]
   [quil.middleware :as m]
   [utils.vectorop :as v]))

;;; Constants & Config ;;;

(def snap-dist 15)
(def point-radius 5)
(def toolbar-height 60)

(def palette
  {:bg    [245 242 235]  ; Parchment
   :lines [40 40 50]     ; Dark Ink
   :ghost [150 150 180]  ; Faint construction lines/points
   :guide [200 100 100]  ; Active drawing guide
   :ui    [220 220 220]
   :ui-sel [180 200 180]})

;; Shifted buttons right to avoid overlap with the main menu burger icon (width 80)
(def buttons
  [{:key :point  :label "Point"  :x 100 :w 80}
   {:key :line   :label "Line"   :x 190 :w 80}
   {:key :circle :label "Circle" :x 280 :w 80}
   {:key :undo   :label "Undo"   :x 370 :w 80}
   {:key :clear  :label "Clear"  :x 460 :w 80}])

;;; Geometry Math ;;;

(defn dist-sq [[x1 y1] [x2 y2]]
  (let [dx (- x1 x2) dy (- y1 y2)]
    (+ (* dx dx) (* dy dy))))

(defn intersect-lines
  "Finds intersection of Line A (p1-p2) and Line B (p3-p4).
   Returns nil if parallel."
  [{:keys [p1 p2]} {:keys [p1 p2] :as _line_b}]
  (let [[x1 y1] p1 [x2 y2] p2
        [x3 y3] (:p1 _line_b) [x4 y4] (:p2 _line_b)
        denom (- (* (- x1 x2) (- y3 y4)) (* (- y1 y2) (- x3 x4)))]
    (if (zero? denom)
      nil
      (let [t (/ (- (* (- x1 x3) (- y3 y4)) (* (- y1 y3) (- x3 x4))) denom)
            u (/ (- (* (- x1 x3) (- y1 y2)) (* (- y1 y3) (- x1 x2))) denom)]
        (when (and (>= t 0) (<= t 1) (>= u 0) (<= u 1)) ;; Segment intersection only?
          [(+ x1 (* t (- x2 x1)))
           (+ y1 (* t (- y2 y1)))])))))

(defn intersect-lines-infinite
  "Finds intersection of Line A and Line B treating them as infinite."
  [l1 l2]
  (let [[x1 y1] (:p1 l1) [x2 y2] (:p2 l1)
        [x3 y3] (:p1 l2) [x4 y4] (:p2 l2)
        denom (- (* (- x1 x2) (- y3 y4)) (* (- y1 y2) (- x3 x4)))]
    (if (< (Math/abs denom) 0.0001)
      nil
      (let [factor1 (- (* x1 y2) (* y1 x2))
            factor2 (- (* x3 y4) (* y3 x4))
            x (/ (- (* factor1 (- x3 x4)) (* (- x1 x2) factor2)) denom)
            y (/ (- (* factor1 (- y3 y4)) (* (- y1 y2) factor2)) denom)]
        ;; Only return if inside screen bounds to avoid chaos
        (when (and (> x 0) (< x (q/width)) (> y toolbar-height) (< y (q/height)))
          [x y])))))

(defn intersect-circles
  "Finds intersection points of two circles."
  [c1 c2]
  (let [p1 (:center c1) r1 (:r c1)
        p2 (:center c2) r2 (:r c2)
        d2 (dist-sq p1 p2)
        d (Math/sqrt d2)]
    (cond
      (or (> d (+ r1 r2))       ;; Separate
          (< d (Math/abs (- r1 r2))) ;; Contained
          (zero? d))            ;; Coincident
      nil
      :else
      (let [a (/ (+ (- (* r1 r1) (* r2 r2)) d2) (* 2 d))
            h (Math/sqrt (Math/max 0 (- (* r1 r1) (* a a))))
            [x0 y0] p1
            [x1 y1] p2
            x2 (+ x0 (* a (/ (- x1 x0) d)))
            y2 (+ y0 (* a (/ (- y1 y0) d)))
            rx (* h (/ (- y1 y0) d))
            ry (* h (/ (- x1 x0) d))]
        [[(+ x2 rx) (- y2 ry)]
         [(- x2 rx) (+ y2 ry)]]))))

;;; State Management ;;;

(defn setup []
  (q/smooth)
  (q/text-font "Courier New")
  (q/text-size 14)
  {:points []      ;; [{:pos [x y]}]
   :lines []       ;; [{:p1 [x y] :p2 [x y]}]
   :circles []     ;; [{:center [x y] :edge [x y] :r 10}]
   :ghosts []      ;; Calculated intersection points for this frame
   :tool :point    ;; :point, :line, :circle
   :selection nil  ;; Temporary storage for multi-click tools (e.g., line start)
   :mouse-pos [0 0]
   :snapped nil})  ;; The point the mouse is currently snapped to

(defn calculate-ghosts [lines circles]
  ;; Brute force intersection of all primitives.
  (let [l-intersections
        (for [i (range (count lines))
              j (range (inc i) (count lines))]
          (intersect-lines-infinite (nth lines i) (nth lines j)))

        c-intersections
        (for [i (range (count circles))
              j (range (inc i) (count circles))]
          (intersect-circles (nth circles i) (nth circles j)))]

    (->> (concat l-intersections (apply concat c-intersections))
         (remove nil?)
         (vec))))

(defn get-closest-point [pos points ghosts]
  (let [all-points (concat
                    (map (fn [p] {:pos (:pos p) :type :real}) points)
                    (map (fn [p] {:pos p :type :ghost}) ghosts))
        closest (reduce (fn [acc p]
                          (let [d (dist-sq pos (:pos p))]
                            (if (and (< d (* snap-dist snap-dist))
                                     (< d (:dist acc)))
                              {:dist d :point p}
                              acc)))
                        {:dist 999999 :point nil}
                        all-points)]
    (:point closest)))

(defn update-state [state]
  (let [mx (q/mouse-x) my (q/mouse-y)
        ghosts (calculate-ghosts (:lines state) (:circles state))
        snap-result (get-closest-point [mx my] (:points state) ghosts)]
    (assoc state
           :mouse-pos [mx my]
           :ghosts ghosts
           :snapped (:pos (:point snap-result))
           :snap-type (:type (:point snap-result)))))

;;; Drawing ;;;

(defn draw-ui [state]
  (q/push-matrix)
  (q/translate 0 0)
  (q/no-stroke)
  (q/fill 200)
  (q/rect 0 0 (q/width) toolbar-height)

  (doseq [btn buttons]
    (if (= (:tool state) (:key btn))
      (q/fill (conj (:ui-sel palette) 255))
      (q/fill (conj (:ui palette) 255)))
    (q/stroke 100)
    (q/rect (:x btn) 10 (:w btn) 40)
    (q/fill 50)
    (q/text-align :center :center)
    (q/text (:label btn) (+ (:x btn) (/ (:w btn) 2)) 30))
  (q/pop-matrix))

(defn draw-primitives [state]
  ;; Draw Circles
  (q/no-fill)
  (q/stroke (conj (:lines palette) 200))
  (q/stroke-weight 1.5)
  (doseq [{:keys [center r]} (:circles state)]
    (q/ellipse (first center) (second center) (* r 2) (* r 2)))

  ;; Draw Lines
  (doseq [{:keys [p1 p2]} (:lines state)]
    ;; Draw infinite construction line faint
    (q/stroke (conj (:ghost palette) 100))
    (q/stroke-weight 1)
    (let [dx (- (first p2) (first p1))
          dy (- (second p2) (second p1))
          angle (Math/atan2 dy dx)
          diag (v/mag [(q/width) (q/height)])]
      (q/line (- (first p1) (* diag (Math/cos angle)))
              (- (second p1) (* diag (Math/sin angle)))
              (+ (first p1) (* diag (Math/cos angle)))
              (+ (second p1) (* diag (Math/sin angle)))))

    ;; Draw actual segment bold
    (q/stroke (conj (:lines palette) 255))
    (q/stroke-weight 2)
    (q/line (first p1) (second p1) (first p2) (second p2)))

  ;; Draw Points
  (q/no-stroke)
  (doseq [p (:points state)]
    (q/fill 0)
    (let [[x y] (:pos p)]
      (q/ellipse x y point-radius point-radius))))

(defn draw-interaction [state]
  (let [[mx my] (:mouse-pos state)
        active-pos (or (:snapped state) [mx my])]

    ;; Draw Ghost Points (Intersections)
    (q/no-stroke)
    (q/fill (conj (:ghost palette) 150))
    (doseq [g (:ghosts state)]
      (q/ellipse (first g) (second g) 4 4))

    ;; Draw Snap Highlight
    (when (:snapped state)
      (q/no-fill)
      (q/stroke (conj (:guide palette) 200))
      (q/stroke-weight 2)
      (q/ellipse (first active-pos) (second active-pos) 15 15))

    ;; Draw Tool Previews
    (when (:selection state)
      (q/stroke (conj (:guide palette) 150))
      (q/stroke-weight 1)
      (case (:tool state)
        :line
        (q/line (first (:selection state)) (second (:selection state))
                (first active-pos) (second active-pos))

        :circle
        (let [radius (v/mag (v/sub active-pos (:selection state)))]
          (q/ellipse (first (:selection state)) (second (:selection state))
                     (* radius 2) (* radius 2)))
        nil))))

(defn draw-state [state]
  (apply q/background (:bg palette))
  (draw-primitives state)
  (draw-interaction state)
  (draw-ui state))

;;; Interaction ;;;

(defn clicked-toolbar? [y]
  (< y toolbar-height))

(defn get-button-at [x]
  (first (filter #(and (>= x (:x %)) (<= x (+ (:x %) (:w %)))) buttons)))

(defn add-point [state pos]
  (if (some #(< (dist-sq pos (:pos %)) 1) (:points state))
    state ;; Don't add duplicate points
    (update state :points conj {:pos pos})))

(defn handle-tool-click [state]
  (let [raw-pos (:mouse-pos state)
        pos (or (:snapped state) raw-pos)]

    (case (:tool state)
      :point
      (add-point state pos)

      :line
      (if (:selection state)
        (-> state
            (add-point (:selection state)) ;; Ensure start is a real point
            (add-point pos)                ;; Ensure end is a real point
            (update :lines conj {:p1 (:selection state) :p2 pos})
            (assoc :selection nil))
        (assoc state :selection pos))

      :circle
      (if (:selection state)
        (let [radius (v/mag (v/sub pos (:selection state)))]
          (if (> radius 0.1)
            (-> state
                (add-point (:selection state))
                (add-point pos) ;; Add the defining point on the edge
                (update :circles conj {:center (:selection state) :edge pos :r radius})
                (assoc :selection nil))
            (assoc state :selection nil))) ;; Cancel if radius is 0
        (assoc state :selection pos))

      state)))

(defn mouse-released [state event]
  (let [x (:x event)
        y (:y event)]
    (if (clicked-toolbar? y)
      (if-let [btn (get-button-at x)]
        (case (:key btn)
          :clear (assoc state :points [] :lines [] :circles [] :ghosts [] :selection nil)
          :undo  (assoc state :selection nil) ;; Simple undo: reset selection
          (assoc state :tool (:key btn) :selection nil))
        state)
      ;; Canvas click
      (handle-tool-click state))))

(registry/def-sketch "Euclid" '(160 100 100)
  {:host "sketch"
   :title "Euclidean Construction"
   :setup setup
   :update update-state
   :draw draw-state
   :renderer :p2d
   :mouse-clicked menu/when-mouse-pressed
   :mouse-released mouse-released
   :size [menu/w menu/h]
   :middleware [menu/show-frame-rate
                m/fun-mode]})