(ns sketches.figget
  (:require [quil.core :as q] [menu :as menu] [registry :as registry]
            [quil.middleware :as m] [utils.vectorop :as v]))

;; A small artificial-life study inspired by ALIEN: https://github.com/chrxh/alien
;; Energy moves between organisms, food, and a recycling reservoir.
(def palette [[104 224 202] [139 180 255] [232 153 208] [238 192 119]])
(defonce actions (atom []))
(def capacity 140)
(def food-energy 2)

(defn safe-unit [direction]
  (let [length (v/mag direction)]
    (if (< length 0.0001) [0 0] (v/div direction length))))

(defn bounce [{[x y] :location [vx vy] :speed :as cell}]
  (let [r 8 w (q/width) h (q/height)]
    (assoc cell :location [(max r (min (- w r) x)) (max r (min (- h r) y))]
                :speed [(if (or (< x r) (> x (- w r))) (* -0.8 vx) vx)
                        (if (or (< y r) (> y (- h r))) (* -0.8 vy) vy)])))

(defn center [organism]
  (v/div (reduce v/add [0 0] (map :location (:cells organism))) (count (:cells organism))))

(defn create-vortex [location spin]
  {:location location :spin spin :radius (* 0.38 (min (q/width) (q/height)))})

(defn vortex-force [location {:keys [spin radius] origin :location}]
  (let [direction (v/sub origin location) d (v/mag direction)
        [ux uy] (safe-unit direction) strength (max 0 (- 1 (/ d radius)))]
    (v/mult [(- (* 0.08 ux) (* spin 0.24 uy))
             (+ (* 0.08 uy) (* spin 0.24 ux))] strength)))

(defn currents [location vortices]
  (reduce v/add [0 0] (map #(vortex-force location %) vortices)))

(defn nutrient [location energy]
  {:location location :speed [(q/random -0.25 0.25) (q/random -0.25 0.25)] :energy energy})

(defn organism [id location]
  (let [radius (if (< (q/width) 600) 16 22)
        angle (q/random (* 2 Math/PI))
        cells (into [{:location location :speed [0 0] :role :core}]
                    (map (fn [i]
                           (let [a (+ angle (* i (/ Math/PI 2)))]
                             {:location (v/add location [(* radius (Math/cos a)) (* radius (Math/sin a))])
                              :speed [0 0] :role (if (even? i) :feeder :swimmer)})) (range 4)))
        pairs [[0 1] [0 2] [0 3] [0 4] [1 2] [2 3] [3 4] [4 1]]]
    {:id id :color (nth palette (mod id 4)) :energy (q/random 70 110) :reserve 24
     :heading [(Math/cos angle) (Math/sin angle)] :cells cells
     :bonds (mapv (fn [[a b]] {:a a :b b :rest (v/mag (v/sub (:location (nth cells a)) (:location (nth cells b))))}) pairs)}))

(def control-css
  "#figget-controls{display:none;position:fixed;bottom:18px;right:18px;z-index:15;gap:6px}body[data-sketch='Figget-A-Balls'] #figget-controls{display:flex}#figget-controls button{background:#10242deb;border:1px solid #76cab14d;color:#bde8db;border-radius:8px;padding:9px 12px;cursor:pointer;font:12px system-ui;touch-action:manipulation}#figget-controls button:focus-visible{outline:2px solid #eec077}@media(max-width:600px){#figget-controls{bottom:92px;right:14px}}")

(defn init-controls! []
  (when-not (.getElementById js/document "figget-controls")
    (let [panel (menu/element "div" "" nil)]
      (set! (.-id panel) "figget-controls")
      (.appendChild (.-head js/document) (menu/element "style" "" control-css))
      (doseq [[label action] [["Pause" :pause] ["Currents" :currents] ["Reseed" :reset]]]
        (let [button (menu/element "button" "" label)]
          (set! (.-type button) "button")
          (.setAttribute button "data-ecosystem-action" (name action))
          (.addEventListener button "click" (fn [_] (swap! actions conj action)))
          (.addEventListener button "mousedown" (fn [event] (.preventDefault event)))
          (.appendChild panel button)))
      (.appendChild (.-body js/document) panel))))

(defn setup []
  (init-controls!)
  (reset! actions [])
  (q/resize-sketch (.-innerWidth js/window) (.-innerHeight js/window))
  (q/frame-rate 60)
  (q/pixel-density 1)
  (let [w (q/width) h (q/height) n (if (< w 600) 10 16)
        columns (if (< w 600) 2 4)]
    {:organisms (mapv #(organism % [(* w (/ (+ 0.5 (mod % columns)) columns))
                                     (+ 120 (* (max 80 (- h 260)) (/ (+ 0.5 (int (/ % columns))) (/ n columns))))]) (range n))
     :food (mapv (fn [_] (nutrient [(q/random 12 (- w 12)) (q/random 100 (- h 100))] food-energy)) (range 180))
     :vortices [(create-vortex [(* w 0.3) (* h 0.4)] 1) (create-vortex [(* w 0.7) (* h 0.6)] -1)]
     :reservoir 180 :tick 0 :deaths 0 :meals 0 :paused? false :currents? true :width w :height h}))

(defn energy-total [state]
  (+ (:reservoir state) (reduce + 0 (map :energy (:food state)))
     (reduce + 0 (map #(+ (:energy %) (:reserve %)) (:organisms state)))))

(defn steer [body food tick]
  (if (and (seq food) (zero? (mod (+ tick (:id body)) 12)))
    (let [p (center body)
          nearest (reduce (fn [best f]
                            (if (< (v/mag (v/sub (:location f) p)) (v/mag (v/sub (:location best) p))) f best)) food)]
      (assoc body :heading (safe-unit (v/add (v/mult (:heading body) 0.6)
                                            (v/mult (safe-unit (v/sub (:location nearest) p)) 0.4))))) body))

(defn swim [body neighbors vortices tick]
  (let [cells (:cells body)
        elastic (reduce (fn [forces {:keys [a b rest]}]
                          (let [ca (nth cells a) cb (nth cells b)
                                direction (v/sub (:location cb) (:location ca))
                                unit (safe-unit direction)
                                extension (- (v/mag direction) rest)
                                relative (v/sub (:speed cb) (:speed ca))
                                force (v/mult unit (+ (* 0.09 extension) (* 0.12 (+ (* (first relative) (first unit)) (* (second relative) (second unit))))))]
                            (-> forces (update a v/add force) (update b v/add (v/mult force -1)))))
                        (vec (repeat (count cells) [0 0])) (:bonds body))
        location (center body)
        separation (reduce v/add [0 0]
                           (for [other neighbors :when (not= (:id body) (:id other))
                                 :let [direction (v/sub location (center other)) d (v/mag direction)]
                                 :when (< d 48)]
                             (v/mult (safe-unit direction) (* 0.08 (- 1 (/ d 48))))))
        cells (mapv (fn [index cell]
                      (let [motor (if (= :swimmer (:role cell))
                                    (v/mult (:heading body) (* 0.13 (+ 0.65 (* 0.35 (Math/sin (+ (* tick 0.11) index (:id body))))))) [0 0])
                            force (reduce v/add [0 0] [(nth elastic index) motor separation
                                                       (v/mult (currents (:location cell) vortices) 0.3)])
                            velocity (v/limit (v/add (v/mult (:speed cell) 0.94) force) 2.5)]
                        (bounce (assoc cell :speed velocity :location (v/add (:location cell) velocity))))) (range) cells)
        cost (+ 0.014 (* 0.002 (reduce + (map #(v/mag (:speed %)) cells))))]
    [(assoc body :cells cells :energy (max 0 (- (:energy body) cost))) (min cost (:energy body))]))

(defn feed [body food]
  (reduce (fn [[body remaining meals] f]
            (if (and (< (:energy body) capacity)
                     (some #(and (= :feeder (:role %)) (< (v/mag (v/sub (:location %) (:location f))) 14)) (:cells body)))
              (let [amount (min (:energy f) (- capacity (:energy body)))
                    leftover (- (:energy f) amount)]
                [(update body :energy + amount)
                 (cond-> remaining (> leftover 0.000001) (conj (assoc f :energy leftover)))
                 (inc meals)])
              [body (conj remaining f) meals])) [body [] 0] food))

(defn step-world [state]
  (let [vortices (if (:currents? state) (:vortices state) [])
        food (mapv (fn [f]
                     (let [speed (v/limit (v/add (v/mult (:speed f) 0.97) (currents (:location f) vortices)) 1.4)]
                       (bounce (assoc f :speed speed :location (v/add (:location f) speed))))) (:food state))
        [bodies food reservoir deaths meals]
        (reduce (fn [[bodies food pool deaths meals] body]
                  (let [[body spent] (swim (steer body food (:tick state)) (:organisms state) vortices (:tick state))
                        [body food eaten] (feed body food)]
                    (if (< (:energy body) 5)
                      [bodies (into food (map #(nutrient (:location %) (/ (+ (:energy body) (:reserve body)) (count (:cells body)))) (:cells body)))
                       (+ pool spent) (inc deaths) (+ meals eaten)]
                      [(conj bodies body) food (+ pool spent) deaths (+ meals eaten)])))
                [[] food (:reservoir state) (:deaths state) (:meals state)] (:organisms state))
        recycle? (and (zero? (mod (:tick state) 4)) (>= reservoir food-energy) (< (count food) 300))
        food (if recycle? (conj food (nutrient [(q/random 12 (- (q/width) 12)) (q/random 100 (- (q/height) 100))] food-energy)) food)]
    (assoc state :organisms bodies :food food :reservoir (if recycle? (- reservoir food-energy) reservoir)
                 :deaths deaths :meals meals :tick (inc (:tick state)))))

(defn apply-action [state action]
  (case action :pause (update state :paused? not) :currents (update state :currents? not)
        :reset (merge state (setup)) state))

(defn resize-world [state w h]
  (let [sx (/ w (:width state)) sy (/ h (:height state))
        scale-pos (fn [[x y]] [(* x sx) (* y sy)])
        bodies (mapv (fn [body]
                       (let [cells (mapv #(bounce (update % :location scale-pos)) (:cells body))]
                         (assoc body :cells cells :bonds
                                (mapv (fn [{:keys [a b] :as bond}]
                                        (assoc bond :rest (v/mag (v/sub (:location (nth cells a)) (:location (nth cells b)))))) (:bonds body))))) (:organisms state))]
    (assoc state :width w :height h :organisms bodies
                 :food (mapv #(bounce (update % :location scale-pos)) (:food state))
                 :vortices (mapv #(create-vortex (scale-pos (:location %)) (:spin %)) (:vortices state)))))

(defn update-state [state]
  (let [pending @actions _ (reset! actions [])
        state (if (:menu-visible? state) state (reduce apply-action state pending))
        w (.-innerWidth js/window) h (.-innerHeight js/window)
        state (if (or (not= w (:width state)) (not= h (:height state)))
                (do (q/resize-sketch w h) (resize-world state w h)) state)
        state (if (or (:menu-visible? state) (:paused? state)) state (step-world state))]
    (when-let [button (.querySelector js/document "[data-ecosystem-action=pause]")]
      (set! (.-textContent button) (if (:paused? state) "Resume" "Pause")))
    (when-let [button (.querySelector js/document "[data-ecosystem-action=currents]")]
      (.setAttribute button "aria-pressed" (str (:currents? state))))
    state))

(defn draw-vortex [{[x y] :location :keys [spin radius]} tick]
  (q/no-fill) (q/stroke-weight 1)
  (q/stroke 89 115 167 20) (q/ellipse x y (* radius 2) (* radius 2))
  (doseq [i (range 12)]
    (let [angle (+ (* spin tick 0.007) (* i (/ Math/PI 6)))
          r (+ 9 (* i 1.1))]
      (q/stroke 137 153 206 (+ 24 (* i 5)))
      (q/line (+ x (* r (Math/cos angle))) (+ y (* r (Math/sin angle)))
              (+ x (* (+ r 8) (Math/cos (+ angle 0.2)))) (+ y (* (+ r 8) (Math/sin (+ angle 0.2))))))))

(defn draw-organism [{:keys [cells bonds color energy id]} tick]
  (q/no-stroke)
  (apply q/fill (conj color 8))
  (q/begin-shape)
  (doseq [cell (rest cells)] (apply q/vertex (:location cell)))
  (q/end-shape :close)
  (q/stroke-weight 1)
  (doseq [{:keys [a b]} bonds]
    (apply q/stroke (conj color (+ 25 (* 100 (/ energy capacity)))))
    (let [[x y] (:location (nth cells a)) [xx yy] (:location (nth cells b))]
      (q/line x y xx yy)))
  (doseq [{[x y] :location :keys [role]} cells]
    (q/no-stroke)
    (apply q/fill (conj color 12)) (q/ellipse x y 22 22)
    (apply q/fill (conj color (+ 65 (* 180 (/ energy capacity)))))
    (case role
      :core (do (q/ellipse x y 10 10) (q/fill 5 15 21) (q/ellipse x y 4 4))
      :feeder (do (q/no-fill) (apply q/stroke (conj color 220)) (q/stroke-weight 1.5)
                  (q/ellipse x y 10 10) (q/ellipse x y 4 4))
      :swimmer (do (q/ellipse x y 6 6)
                   (let [wiggle (* 4 (Math/sin (+ (* tick 0.15) id)))]
                     (apply q/stroke (conj color 130)) (q/stroke-weight 1)
                     (q/line x y (+ x 7) (+ y wiggle))))))
  ;; Energy ring makes hunger visible without labels on every creature.
  (let [[x y] (:location (first cells))]
    (q/no-fill) (apply q/stroke (conj color 65)) (q/stroke-weight 1)
    (q/ellipse x y (+ 13 (* 7 (/ energy capacity))) (+ 13 (* 7 (/ energy capacity))))))

(defn draw-state [{:keys [organisms food vortices tick currents? paused? deaths meals]}]
  (q/background 5 12 19)
  (q/ellipse-mode :center) (q/rect-mode :corner)
  (when currents? (doseq [vortex vortices] (draw-vortex vortex tick)))
  (q/no-stroke)
  (doseq [{[x y] :location energy :energy} food]
    (q/fill 229 202 127 15) (q/ellipse x y 10 10)
    (q/fill 229 202 127 180) (q/ellipse x y (+ 1.5 (* 0.6 energy)) (+ 1.5 (* 0.6 energy))))
  (doseq [body organisms] (draw-organism body tick))
  (q/text-font "monospace") (q/no-stroke) (q/text-size 11)
  (q/fill 162 195 201) (q/text-align :right :top)
  (q/text (str (count organisms) " organisms / " (count food) " nutrients") (- (q/width) 20) 76)
  (q/text-size 10) (q/fill 94 137 148)
  (q/text (str meals " feeds / " deaths " decayed") (- (q/width) 20) 94)
  (q/text-align :left :bottom) (q/text-size 11) (q/fill 162 195 201)
  (q/text "FIGGET-A-BALLS / LIVING CELLS" 20 (- (q/height) 62))
  (q/text-size 10) (q/fill 94 137 148)
  (q/text "Ring cells feed / Tailed cells swim" 20 (- (q/height) 43))
  (q/text "Energy spent becomes food / R reseeds" 20 (- (q/height) 25))
  (when (or paused? (empty? organisms))
    (q/text-align :center :center) (q/text-size 16) (q/fill 204 222 214)
    (q/text (if paused? "PAUSED" "ECOSYSTEM RESTING / RESEED TO BEGIN") (/ (q/width) 2) (/ (q/height) 2))))

(defn key-pressed [state event]
  (if (or (:menu-visible? state)
          (some-> (.-activeElement js/document) (.closest "#figget-controls"))) state
    (case (:key event) :space (apply-action state :pause) :c (apply-action state :currents)
          :r (apply-action state :reset) state)))

(registry/def-sketch "Figget-A-Balls" '(104 224 202)
  {:host "sketch" :title "Living cells" :setup setup :update update-state :draw draw-state
   :renderer :p2d :key-pressed key-pressed :size [menu/w menu/h]
   :middleware [menu/show-frame-rate m/fun-mode]})
