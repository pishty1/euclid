(ns sketches.euclid
  (:require [quil.core :as q]
            [quil.middleware :as m]
            [menu :as menu]
            [registry :as registry]))

(def epsilon 0.000001)
(def limits {:points 40 :lines 32 :circles 18})
(def palette {:background [8 15 23] :gold [236 196 139]
              :blue [119 196 220] :violet [172 151 226]
              :ink [193 211 213] :guide [71 108 130]})
(defonce actions (atom []))

(defn add [[ax ay] [bx by]] [(+ ax bx) (+ ay by)])
(defn sub [[ax ay] [bx by]] [(- ax bx) (- ay by)])
(defn times [[x y] scale] [(* x scale) (* y scale)])
(defn dot [[ax ay] [bx by]] (+ (* ax bx) (* ay by)))
(defn length-sq [v] (dot v v))
(defn distance [a b] (Math/sqrt (length-sq (sub a b))))
(defn midpoint [a b] (times (add a b) 0.5))
(defn clamp [x low high] (max low (min high x)))

(defn intersect-lines [l1 l2]
  (let [a (:p1 l1) b (:p2 l1) c (:p1 l2) d (:p2 l2)
        [rx ry] (sub b a) [sx sy] (sub d c)
        det (- (* rx sy) (* ry sx))]
    (when (> (Math/abs det) epsilon)
      (let [[qx qy] (sub c a)
            t (/ (- (* qx sy) (* qy sx)) det)]
        (add a (times [rx ry] t))))))

(defn intersect-circles [{a :center ra :r} {b :center rb :r}]
  (let [d (distance a b)]
    (when (and (> d epsilon) (<= d (+ ra rb epsilon))
               (>= d (- (Math/abs (- ra rb)) epsilon)))
      (let [along (/ (+ (- (* ra ra) (* rb rb)) (* d d)) (* 2 d))
            height (Math/sqrt (max 0 (- (* ra ra) (* along along))))
            [ux uy] (times (sub b a) (/ 1 d))
            center (add a (times [ux uy] along))
            offset (times [(- uy) ux] height)]
        [(add center offset) (sub center offset)]))))

(defn intersect-line-circle [{a :p1 b :p2} {:keys [center r]}]
  (let [direction (sub b a) offset (sub a center)
        aa (length-sq direction) bb (* 2 (dot direction offset))
        cc (- (length-sq offset) (* r r))
        discriminant (- (* bb bb) (* 4 aa cc))]
    (when (and (> aa epsilon) (>= discriminant (- epsilon)))
      (let [root (Math/sqrt (max 0 discriminant))]
        (mapv #(add a (times direction (/ (+ (- bb) %) (* 2 aa)))) [root (- root)])))))

(defn project-to-line [p a b]
  (let [direction (sub b a) size (length-sq direction)]
    (if (< size epsilon) a
        (add a (times direction (/ (dot (sub p a) direction) size))))))

(defn triangle-proof [a b c]
  (let [[ax ay] a [bx by] b [cx cy] c
        determinant (* 2 (+ (* ax (- by cy)) (* bx (- cy ay)) (* cx (- ay by))))]
    (when (> (Math/abs determinant) epsilon)
      (let [aa (length-sq a) bb (length-sq b) cc (length-sq c)
            o [(/ (+ (* aa (- by cy)) (* bb (- cy ay)) (* cc (- ay by))) determinant)
               (/ (+ (* aa (- cx bx)) (* bb (- ax cx)) (* cc (- bx ax))) determinant)]
            side-a (distance b c) side-b (distance a c) side-c (distance a b)
            perimeter (+ side-a side-b side-c)
            i (times (add (add (times a side-a) (times b side-b)) (times c side-c)) (/ 1 perimeter))
            g (times (add (add a b) c) (/ 1 3))
            h (sub (add (add a b) c) (times o 2))
            angles (mapv (fn [[p u v]]
                           (let [pu (sub u p) pv (sub v p)]
                             (Math/acos (clamp (/ (dot pu pv) (* (distance p u) (distance p v))) -1 1))))
                         [[a b c] [b a c] [c a b]])]
        {:o o :i i :g g :h h :n (midpoint o h)
         :circum-radius (distance o a) :in-radius (/ (Math/abs determinant) (* 2 perimeter))
         :angles angles :feet [(project-to-line a b c) (project-to-line b a c) (project-to-line c a b)]}))))

(defn point [id pos] {:id id :pos pos :home pos})

(defn scene-data [scene]
  (case scene
    :triangle {:points [(point 0 [-0.9 0.48]) (point 1 [0.92 0.4]) (point 2 [-0.35 -0.48])]
               :lines [{:a 0 :b 1} {:a 1 :b 2} {:a 2 :b 0}] :circles [] :next-id 3}
    :vesica {:points [(point 0 [-0.45 0]) (point 1 [0.45 0])]
             :lines [{:a 0 :b 1}] :circles [{:center 0 :edge 1} {:center 1 :edge 0}] :next-id 2}
    :rose {:points (into [(point 0 [0 0])]
                        (map (fn [i] (let [angle (* i (/ Math/PI 3))]
                                       (point (inc i) [(* 0.65 (Math/cos angle)) (* 0.65 (Math/sin angle))])))
                             (range 6)))
           :lines (mapv (fn [i] {:a 0 :b i}) (range 1 7))
           :circles (into [{:center 0 :edge 1}] (map (fn [i] {:center i :edge 0}) (range 1 7)))
           :next-id 7}
    {:points [] :lines [] :circles [] :next-id 0}))

(defn snapshot [state]
  (select-keys state [:points :lines :circles :next-id :scene :motion? :phase :guides?]))

(defn remember [state before]
  (update state :history #(vec (take-last 24 (conj % before)))))

(defn load-scene [state scene]
  (merge state (scene-data scene) {:scene scene :tool :move :selection nil :dragging nil
                                  :motion? (not= scene :free) :phase 0 :trails [] :status ""}))

(defn undo [state]
  (if-let [previous (peek (:history state))]
    (merge state previous {:history (pop (:history state)) :selection nil :dragging nil :trails [] :status ""})
    (assoc state :selection nil)))

(defn active? [] (= "Euclid" (:name (registry/get-sketch @menu/selected-sketch))))
(defn enqueue! [action] (when (and (active?) (not @menu/menu-visible)) (swap! actions conj action)))

(def control-styles
  "#euclid-instruments{display:none;position:fixed;z-index:15;bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);padding:10px;border:1px solid #b5c7c52b;border-radius:16px;background:#101c25ed;backdrop-filter:blur(14px);box-shadow:0 12px 48px #0005;font:12px system-ui,sans-serif;box-sizing:border-box}
   body[data-sketch=Euclid] #euclid-instruments{display:flex;flex-direction:column;gap:7px}
   #euclid-instruments .instrument-row{display:flex;justify-content:center;gap:5px;flex-wrap:wrap}
   #euclid-instruments button{min-height:34px;padding:0 13px;border:1px solid #ffffff18;border-radius:8px;background:transparent;color:#9fb7c4;font:inherit;cursor:pointer;touch-action:manipulation}
   #euclid-instruments button:hover{background:#ffffff0b;color:#e7e1d0}
   #euclid-instruments button[aria-pressed=true]{background:#e9c69117;border-color:#e9c69160;color:#f0d7b1}
   #euclid-instruments button:focus-visible{outline:2px solid #efcf95;outline-offset:2px}
   @media(max-width:600px){#euclid-instruments{width:calc(100vw - 24px)}#euclid-instruments .instrument-row{display:grid;grid-template-columns:repeat(4,1fr)}#euclid-instruments button{padding:0 3px;min-height:36px;font-size:11px}}")

(defn init-controls! []
  (when-not (.getElementById js/document "euclid-instruments")
    (let [style (menu/element "style" "" control-styles)
          panel (menu/element "div" "" nil)
          tools (menu/element "div" "instrument-row" nil)
          scenes (menu/element "div" "instrument-row" nil)]
      (set! (.-id panel) "euclid-instruments")
      (.setAttribute panel "role" "toolbar")
      (.setAttribute panel "aria-label" "Euclidean construction instruments")
      (.appendChild (.-head js/document) style)
      (doseq [[parent items] [[tools [[:move "Move" "Drag a point"] [:point "Point" "Plant a point"]
                                    [:line "Ruler" "Connect two points"] [:circle "Compass" "Choose a center and an edge"]]]
                             [scenes [[:triangle "Triangle" "A living triangle and its centers"]
                                      [:vesica "Vesica" "Two equal intersecting circles"]
                                      [:rose "Rose" "A sixfold compass construction"]
                                      [:play "Pause" "Animate or hold the construction"]
                                      [:guides "Guides" "Show or hide construction guides"]
                                      [:undo "Undo" "Undo the last edit"] [:clear "Clear" "Start a blank construction"]]]]]
        (doseq [[action label title] items]
          (let [button (menu/element "button" "" label)]
            (set! (.-type button) "button")
            (set! (.-title button) title)
            (.setAttribute button "data-action" (name action))
            (.addEventListener button "click" (fn [_] (enqueue! action)))
            (.addEventListener button "mousedown" (fn [event] (.preventDefault event)))
            (.appendChild parent button))))
      (.appendChild panel tools)
      (.appendChild panel scenes)
      (doseq [event-name ["click" "mousedown" "mouseup" "mousemove" "touchstart" "touchend" "touchmove" "keydown" "keyup"]]
        (.addEventListener panel event-name (fn [event] (.stopPropagation event))))
      (.appendChild (.-body js/document) panel))))

(defn sync-controls! [state]
  (doseq [action [:move :point :line :circle :triangle :vesica :rose :play :guides]]
    (when-let [button (.querySelector js/document (str "#euclid-instruments [data-action='" (name action) "']"))]
      (let [active (case action :play (:motion? state) :guides (:guides? state)
                         (:move :point :line :circle) (= action (:tool state))
                         (= action (:scene state)))]
        (.setAttribute button "aria-pressed" (str (boolean active)))
        (when (= action :play) (set! (.-textContent button) (if (:motion? state) "Pause" "Play")))))))

(defn setup []
  (init-controls!)
  (reset! actions [])
  (q/frame-rate 60)
  (q/resize-sketch (.-innerWidth js/window) (.-innerHeight js/window))
  (when-let [host (.getElementById js/document "sketch")]
    (set! (.-tabIndex host) 0)
    (.setAttribute host "aria-label" "Living geometry: drag points or use the construction instruments")
    (.focus host))
  (load-scene {:history [] :guides? true :ghosts [] :mouse-pos [0 0] :snapped nil} :triangle))

(defn apply-action [state action]
  (cond
    (contains? #{:move :point :line :circle} action)
    (assoc state :tool action :selection nil :motion? false)
    (contains? #{:triangle :vesica :rose} action)
    (remember (load-scene state action) (snapshot state))
    (= action :play) (assoc state :motion? (not (:motion? state)) :selection nil :tool :move)
    (= action :guides) (update state :guides? not)
    (= action :undo) (undo state)
    (= action :clear) (remember (load-scene state :free) (snapshot state))
    :else state))

(defn transform []
  {:center [(/ (q/width) 2) (* 0.44 (q/height))]
   :scale (max 30 (min (* 0.34 (q/width)) (* 0.34 (max 80 (- (q/height) 180)))))})
(defn screen [pos] (let [{:keys [center scale]} (transform)] (add center (times pos scale))))
(defn world [pos] (let [{:keys [center scale]} (transform)] (times (sub pos center) (/ 1 scale))))
(defn point-pos [state id] (:pos (first (filter #(= id (:id %)) (:points state)))))

(defn primitives [state]
  {:lines (mapv (fn [{:keys [a b]}] {:p1 (point-pos state a) :p2 (point-pos state b)}) (:lines state))
   :circles (mapv (fn [{:keys [center edge]}]
                    (let [p (point-pos state center)] {:center p :r (distance p (point-pos state edge))})) (:circles state))})

(defn calculate-ghosts [{:keys [lines circles]}]
  (->> (concat
         (for [i (range (count lines)) j (range (inc i) (count lines))]
           (intersect-lines (nth lines i) (nth lines j)))
         (mapcat identity (for [i (range (count circles)) j (range (inc i) (count circles))]
                           (intersect-circles (nth circles i) (nth circles j))))
         (mapcat identity (for [line lines circle circles] (intersect-line-circle line circle))))
       (remove nil?)
       (filter (fn [[x y]] (and (js/Number.isFinite x) (js/Number.isFinite y) (< (Math/abs x) 3) (< (Math/abs y) 3))))
       (reduce (fn [acc p] (assoc acc (mapv #(Math/round (* % 10000)) p) p)) {})
       vals vec))

(defn closest [state pos real-only?]
  (let [tolerance (/ (if real-only? 20 15) (:scale (transform)))
        candidates (concat (map #(assoc % :kind :real) (:points state))
                           (when-not real-only? (map #(hash-map :pos % :kind :ghost) (:ghosts state)))
                           (when (and (not real-only?) (:guides? state) (:proof state))
                             (map (fn [[id title]] {:pos (id (:proof state)) :kind :proof :title title})
                                  [[:o "Circumcenter"] [:i "Incenter"] [:g "Centroid"]
                                   [:h "Orthocenter"] [:n "Nine-point center"]])))]
    (first (sort-by #(distance pos (:pos %))
                    (filter #(< (distance pos (:pos %)) tolerance) candidates)))))

(defn animate [state]
  (let [phase (+ (:phase state) 0.008)
        scene (:scene state)
        points (mapv (fn [{:keys [id home] :as p}]
                       (assoc p :pos
                              (case scene
                                :triangle (if (= id 2) (add home [(* 0.24 (Math/sin phase)) (* 0.17 (Math/sin (* phase 0.73)))]) (:pos p))
                                :vesica (if (= id 1) (add home [(* 0.12 (Math/sin phase)) 0]) (:pos p))
                                :rose (if (zero? id) (:pos p)
                                          (let [angle (+ (* (dec id) (/ Math/PI 3)) (* phase 0.1))
                                                radius (* 0.65 (+ 1 (* 0.07 (Math/sin phase))))]
                                            [(* radius (Math/cos angle)) (* radius (Math/sin angle))]))
                                :free (if (= id (dec (:next-id state)))
                                        (add home [(* 0.17 (Math/sin phase)) (* 0.17 (Math/sin (* phase 0.77)))]) (:pos p))
                                (:pos p)))) (:points state))]
    (assoc state :phase phase :points points)))

(defn current-proof [state]
  (when (= :triangle (:scene state))
    (triangle-proof (point-pos state 0) (point-pos state 1) (point-pos state 2))))

(defn update-state [state]
  (when (or (not= (q/width) (.-innerWidth js/window)) (not= (q/height) (.-innerHeight js/window)))
    (q/resize-sketch (.-innerWidth js/window) (.-innerHeight js/window)))
  (let [pending @actions]
    (reset! actions [])
    (let [state (if (:menu-visible? state) state (reduce apply-action state pending))
          state (if (and (:motion? state) (not (:menu-visible? state))) (animate state) state)
          ghosts (calculate-ghosts (primitives state))
          pos (world [(q/mouse-x) (q/mouse-y)])
          proof (current-proof state)
          snap (closest (assoc state :ghosts ghosts :proof proof) pos false)
          state (assoc state :ghosts ghosts :mouse-pos pos :snapped snap :proof proof)
          state (if (and proof (:motion? state) (not (:menu-visible? state)))
                  (update state :trails #(vec (take-last 360 (conj % (:o proof))))) state)]
      (sync-controls! state)
      state)))

(defn ensure-point [state pos]
  (if-let [existing (first (filter #(< (distance pos (:pos %)) epsilon) (:points state)))]
    [state (:id existing)]
    (if (>= (count (:points state)) (:points limits)) [state nil]
        [(-> state (update :points conj (point (:next-id state) pos)) (update :next-id inc)) (:next-id state)])))

(defn construct [state pos]
  (let [state (assoc state :motion? false :status "")]
    (case (:tool state)
      :point (let [[updated id] (ensure-point state pos)]
               (cond (nil? id) (assoc state :status "Point limit reached — undo or clear to make room")
                     (= (:points state) (:points updated)) state
                     :else (remember updated (snapshot state))))
      (:line :circle)
      (if-let [start (:selection state)]
        (if (< (distance start pos) epsilon) (assoc state :selection nil)
          (let [kind (if (= :line (:tool state)) :lines :circles)]
            (if (>= (count (kind state)) (kind limits))
              (assoc state :selection nil :status "Construction limit reached — undo or clear")
              (let [[s a] (ensure-point state start) [s b] (ensure-point s pos)]
                (if (or (nil? a) (nil? b)) (assoc state :selection nil :status "Point limit reached")
                    (remember (-> s (update kind conj (if (= kind :lines) {:a a :b b} {:center a :edge b}))
                                  (assoc :selection nil)) (snapshot state)))))))
        (assoc state :selection pos))
      state)))

(defn mouse-pressed [state _]
  (if (:menu-visible? state) state
    (let [pos (world [(q/mouse-x) (q/mouse-y)])
          nearest (closest state pos true)]
      (when-let [host (.getElementById js/document "sketch")] (.focus host))
      (if (and (= :move (:tool state)) nearest)
        (assoc state :dragging (:id nearest) :drag-origin (snapshot state)
                     :drag-start pos :drag-moved? false :motion? false)
        state))))

(defn mouse-dragged [state _]
  (if (or (:menu-visible? state) (nil? (:dragging state))) state
    (let [pos (world [(q/mouse-x) (q/mouse-y)])]
      (-> state
          (update :points #(mapv (fn [p] (if (= (:id p) (:dragging state)) (assoc p :pos pos :home pos) p)) %))
          (assoc :trails [] :drag-moved? (or (:drag-moved? state) (> (distance pos (:drag-start state)) 0.01)))))))

(defn mouse-released [state _]
  (cond
    (:menu-visible? state) state
    (:dragging state) (-> (if (:drag-moved? state) (remember state (:drag-origin state)) state)
                         (dissoc :dragging :drag-origin :drag-start :drag-moved?))
    (= :move (:tool state)) state
    :else (let [pos (world [(q/mouse-x) (q/mouse-y)])
                snapped (closest state pos false)]
            (construct state (or (:pos snapped) pos)))))

(defn key-pressed [state event]
  (if (:menu-visible? state) state
    (case (:key event)
      :m (apply-action state :move)
      :p (apply-action state :point)
      :l (apply-action state :line)
      :c (apply-action state :circle)
      :space (apply-action state :play)
      :z (apply-action state :undo)
      :r (apply-action state (if (= :free (:scene state)) :triangle (:scene state)))
      :escape (assoc state :selection nil :dragging nil)
      state)))

(defn segment [a b]
  (let [[ax ay] (screen a) [bx by] (screen b)] (q/line ax ay bx by)))

(defn circle [center radius]
  (when (and (> radius epsilon) (< radius 12))
    (let [[x y] (screen center) diameter (* 2 radius (:scale (transform)))]
      (q/ellipse x y diameter diameter))))

(defn ray [a b]
  (let [d (sub b a) size (distance a b)]
    (when (> size epsilon)
      (let [direction (times d (/ 4 size))]
        (segment (sub a direction) (add a direction))))))

(defn label [pos text color]
  (let [[x y] (screen pos)]
    (q/no-stroke)
    (apply q/fill color)
    (q/text-size 10)
    (q/text-align :left :center)
    (q/text text (+ x 10) (- y 11))))

(defn dot-at [pos color size]
  (let [[x y] (screen pos)]
    (q/no-stroke)
    (apply q/fill (conj color 15))
    (q/ellipse x y (* size 4) (* size 4))
    (apply q/fill color)
    (q/ellipse x y size size)))

(defn draw-observatory [state]
  (apply q/background (:background palette))
  (q/stroke-weight 1)
  (q/no-fill)
  (doseq [radius [0.5 1 1.5]]
    (q/stroke 74 114 139 14)
    (circle [0 0] radius))
  (doseq [i (range 12)]
    (let [angle (* i (/ Math/PI 6)) direction [(Math/cos angle) (Math/sin angle)]]
      (q/stroke 74 114 139 12)
      (segment (times direction 0.12) (times direction 1.6))))
  (q/no-stroke)
  (doseq [i (range 70)]
    (let [x (* (q/width) (/ (mod (* i 73) 997) 997))
          y (* (q/height) (/ (mod (* i 137) 991) 991))
          alpha (+ 15 (* 12 (+ 1 (Math/sin (+ i (:phase state))))))]
      (q/fill 136 186 207 alpha)
      (q/ellipse x y 1 1))))

(defn draw-primitives [state]
  (let [{:keys [lines circles]} (primitives state)]
    (q/no-fill)
    (q/stroke-weight 1)
    (doseq [[index c] (map-indexed vector circles)]
      (apply q/stroke (conj (nth [(:gold palette) (:blue palette) (:violet palette)] (mod index 3)) 155))
      (circle (:center c) (:r c)))
    (doseq [{:keys [p1 p2]} lines]
      (when (:guides? state)
        (q/stroke-weight 1)
        (apply q/stroke (conj (:guide palette) 60))
        (ray p1 p2))
      (q/stroke-weight 1.3)
      (apply q/stroke (conj (:gold palette) 190))
      (segment p1 p2))))

(defn draw-proof [state]
  (when-let [{:keys [o i g h n circum-radius in-radius feet angles]} (:proof state)]
    (q/no-fill)
    (q/stroke-weight 1)
    (apply q/stroke (conj (:blue palette) 160))
    (circle o circum-radius)
    (apply q/stroke (conj (:gold palette) 120))
    (circle i in-radius)
    (apply q/stroke (conj (:violet palette) 90))
    (circle n (/ circum-radius 2))
    (when (:guides? state)
      (q/stroke-weight 1)
      (apply q/stroke (conj (:violet palette) 100))
      (ray o h)
      (doseq [[id foot] (map-indexed vector feet)]
        (apply q/stroke (conj (:guide palette) 75))
        (segment (point-pos state id) foot)
        (dot-at foot (:guide palette) 2))
      (doseq [[pos text color] [[o "O" (:blue palette)] [i "I" (:gold palette)]
                               [g "G" (:ink palette)] [h "H" (:violet palette)] [n "N" (:violet palette)]]]
        (when (every? #(< (Math/abs %) 4) pos)
          (dot-at pos color 4)
          (label pos text color)))
      (doseq [[id angle] (map-indexed vector angles)]
        (let [[x y] (screen (point-pos state id))]
          (q/no-stroke)
          (q/fill 137 161 176)
          (q/text-size 9)
          (q/text (str (Math/round (* angle (/ 180 Math/PI))) "°") (+ x 10) (+ y 12)))))))

(defn draw-interaction [state]
  (when (:guides? state)
    (doseq [pos (:ghosts state)] (dot-at pos (:guide palette) 2)))
  (doseq [{:keys [id pos]} (:points state)]
    (dot-at pos (:gold palette) (if (= id (:dragging state)) 7 5))
    (when (:guides? state) (label pos (if (< id 26) (js/String.fromCharCode (+ 65 id)) (str "P" id)) (:gold palette))))
  (when-let [snap (:snapped state)]
    (q/no-fill)
    (q/stroke-weight 1)
    (apply q/stroke (conj (:ink palette) 140))
    (let [[x y] (screen (:pos snap))]
      (q/ellipse x y 18 18)
      (when-let [title (:title snap)] (label (:pos snap) title (:ink palette)))))
  (when-let [start (:selection state)]
    (q/no-fill)
    (q/stroke-weight 1)
    (apply q/stroke (conj (:blue palette) 170))
    (let [end (or (:pos (:snapped state)) (:mouse-pos state))]
      (if (= :circle (:tool state)) (circle start (distance start end)) (segment start end))
    (dot-at start (:blue palette) 4))))

(defn draw-state [state]
  (q/rect-mode :corner)
  (q/ellipse-mode :center)
  (q/text-font "monospace")
  (draw-observatory state)
  (q/no-stroke)
  (doseq [[index pos] (map-indexed vector (:trails state))]
    (let [[x y] (screen pos)]
      (apply q/fill (conj (:blue palette) (+ 8 (* 65 (/ index (max 1 (count (:trails state))))))))
      (q/ellipse x y 1.5 1.5)))
  (draw-primitives state)
  (draw-proof state)
  (draw-interaction state)
  (q/no-stroke)
  (q/text-align :right :top)
  (q/text-size 11)
  (q/fill 164 190 200)
  (q/text "EUCLID / LIVING PROOFS" (- (q/width) 22) 76)
  (q/text-size 9)
  (q/fill 99 135 157)
  (q/text (case (:scene state) :triangle "CIRCUMCIRCLE · INCIRCLE · EULER LINE"
                :vesica "TWO EQUAL CIRCLES / VESICA PISCIS"
                :rose "SIXFOLD COMPASS ROSE" "YOUR CONSTRUCTION") (- (q/width) 22) 96)
  (q/text (str (count (:points state)) " anchors · " (count (:lines state)) " rulers · "
               (count (:circles state)) " compass circles") (- (q/width) 22) 112)
  (q/text-align :left :bottom)
  (q/text-size 10)
  (q/fill 147 171 181)
  (let [panel (.getElementById js/document "euclid-instruments")
        y (- (q/height) (if panel (+ 34 (.-offsetHeight panel)) 164))
        hint (if (seq (:status state)) (:status state)
               (if (:selection state) "Choose the second point · Esc cancels"
                 (case (:tool state) :move "Drag anchors · Play brings geometry to life"
                       :point "Plant points · Intersections snap"
                       :line "Choose two points for a ruler"
                       :circle "Choose a center, then an edge")))]
    (q/text hint 22 y)))

(registry/def-sketch "Euclid" '(236 196 139)
  {:host "sketch" :title "Living proofs" :setup setup :update update-state :draw draw-state
   :mouse-pressed mouse-pressed :mouse-dragged mouse-dragged :mouse-released mouse-released
   :key-pressed key-pressed :size [menu/w menu/h]
   :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
