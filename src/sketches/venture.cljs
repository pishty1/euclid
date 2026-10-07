(ns sketches.venture
  (:require [clojure.string :as str]
            [quil.core :as q :include-macros true]
            [quil.middleware :as m]
            [registry :as registry]
            [menu :as menu]))

(defonce actions (atom []))
(defonce best-score (atom 0))

(defn active? []
  (= "Ad Venture" (:name (registry/get-sketch @menu/selected-sketch))))

(defn enqueue! [key]
  (when (and (active?) (not @menu/menu-visible))
    (swap! actions conj key)))

(defonce keyboard-handler
  (let [handler (fn [event]
                  (let [key (.-key event)]
                    (when (and (active?) (not @menu/menu-visible)
                               (not (.-ctrlKey event)) (not (.-metaKey event))
                               (or (re-matches #"[0-9]" key)
                                   (contains? #{"Enter" "Backspace" "p" "P"} key)))
                      ;; Leave native buttons' Enter activation intact.
                      (when-not (and (= key "Enter")
                                     (= "BUTTON" (.-tagName (.-target event))))
                        (.preventDefault event)
                        (when-let [host (.getElementById js/document "sketch")] (.focus host))
                        (when-not (.-repeat event) (enqueue! key))))))]
    (.addEventListener js/window "keydown" handler)
    handler))

(def control-styles
  "#venture-controls{display:none;position:fixed;inset:0;pointer-events:none;z-index:15;font-family:system-ui,sans-serif}
   body[data-sketch='Ad Venture'] #venture-controls{display:block}
   #venture-controls button{pointer-events:auto;touch-action:manipulation;border:1px solid #70dace50;background:#081e25ed;color:#bdfcf0;border-radius:9px;cursor:pointer;font:500 13px system-ui,sans-serif}
   #venture-controls button:hover{background:#153a42}
   #venture-controls button:focus-visible{outline:2px solid #f1ba68;outline-offset:3px}
   #venture-controls .game-toolbar{position:absolute;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));display:flex;gap:6px;pointer-events:auto}
   #venture-controls .game-toolbar button{height:40px;padding:0 12px}
   #venture-keypad{display:none;position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(380px,calc(100vw - 24px));grid-template-columns:repeat(6,1fr);gap:6px;pointer-events:auto}
   #venture-keypad button{min-height:42px;font-size:18px}
   #venture-keypad .fire{background:#96ead7;color:#07232a;font-size:12px;font-weight:700}
   @media(pointer:coarse),(max-width:600px){#venture-keypad{display:grid}}
   @media(max-height:450px){#venture-keypad button{min-height:32px}}
   @media(max-width:600px){body[data-sketch='Ad Venture'] #euclid-nav .current-name{display:none}}
   body[data-sketch='Ad Venture'] #sketch canvas{display:block}")

(defn init-controls! []
  (when-not (.getElementById js/document "venture-controls")
    (let [style (menu/element "style" "" control-styles)
          controls (menu/element "div" "" nil)
          toolbar (menu/element "div" "game-toolbar" nil)
          pause (menu/element "button" "" "Pause")
          full (menu/element "button" "" "⛶")
          keypad (menu/element "div" "" nil)]
      (.appendChild (.-head js/document) style)
      (set! (.-id controls) "venture-controls")
      (set! (.-id keypad) "venture-keypad")
      (set! (.-id pause) "venture-pause")
      (.setAttribute controls "aria-label" "Arithmetic game controls")
      (.setAttribute keypad "role" "group")
      (.setAttribute keypad "aria-label" "Answer keypad")
      (.setAttribute full "aria-label" "Toggle fullscreen")
      (.addEventListener pause "click" (fn [_] (enqueue! "p")))
      (.addEventListener full "click"
                        (fn [_]
                          (if (.-fullscreenElement js/document)
                            (when (.-exitFullscreen js/document)
                              (.catch (.exitFullscreen js/document) (fn [_] nil)))
                            (when (.-requestFullscreen (.-documentElement js/document))
                              (.catch (.requestFullscreen (.-documentElement js/document)) (fn [_] nil))))))
      (doseq [button [full pause]]
        (set! (.-type button) "button")
        (.addEventListener button "mousedown" (fn [event] (.preventDefault event))))
      (.appendChild toolbar full)
      (.appendChild toolbar pause)
      (doseq [[label key] [["1" "1"] ["2" "2"] ["3" "3"] ["4" "4"] ["5" "5"] ["⌫" "Backspace"]
                          ["6" "6"] ["7" "7"] ["8" "8"] ["9" "9"] ["0" "0"] ["FIRE" "Enter"]]]
        (let [button (menu/element "button" (if (= key "Enter") "fire" "") label)]
          (set! (.-type button) "button")
          (.setAttribute button "aria-label" (case key "Backspace" "Delete last digit" "Enter" "Fire answer" label))
          (.addEventListener button "click" (fn [_] (enqueue! key)))
          ;; Avoid stealing focus from the game when a pointer taps the keypad.
          (.addEventListener button "mousedown" (fn [event] (.preventDefault event)))
          (.appendChild keypad button)))
      (.appendChild controls toolbar)
      (.appendChild controls keypad)
      (doseq [event-name ["click" "mousedown" "mouseup" "touchstart" "touchend" "touchmove"]]
        (.addEventListener controls event-name (fn [event] (.stopPropagation event))))
      (.appendChild (.-body js/document) controls))))

(defn touch-controls? [width]
  (or (<= width 600) (.-matches (.matchMedia js/window "(pointer: coarse)"))))

(defn ship-y [state]
  (- (:height state) (if (touch-controls? (:width state))
                       (if (< (:height state) 450) 164 190) 105)))

(defn enemy-y [state enemy]
  (+ 108 (* (:progress enemy) (- (ship-y state) 145))))

(defn lane-x [state lane]
  (* (:width state) (/ (+ lane 0.5) (:lanes state))))

(defn random-int [low high]
  (+ low (int (q/random (inc (- high low))))))

(defn make-problem [wave]
  (let [limit (min 30 (+ 8 (* wave 2)))
        a (random-int 1 limit) b (random-int 1 limit)
        op (nth (if (< wave 2) [:add :subtract] [:add :subtract :multiply :divide])
                (random-int 0 (if (< wave 2) 1 3)))
        factor-a (random-int 2 (min 12 (+ wave 3)))
        factor-b (random-int 2 (min 12 (+ wave 3)))]
    (case op
      :add {:equation (str a " + " b) :answer (+ a b)}
      :subtract {:equation (str (max a b) " − " (min a b)) :answer (Math/abs (- a b))}
      :multiply {:equation (str factor-a " × " factor-b) :answer (* factor-a factor-b)}
      :divide {:equation (str (* factor-a factor-b) " ÷ " factor-a) :answer factor-b})))

(defn new-game [state]
  (merge state {:mode :playing :wave 1 :score 0 :combo 0 :shields 3
                :enemies [] :effects [] :spawned 0 :spawn-timer 0
                :next-id 0 :input "" :message "" :message-timer 0
                :wave-timer 0 :clock 0 :flash 0 :last-time nil}))

(defn setup []
  (init-controls!)
  (q/resize-sketch (.-innerWidth js/window) (.-innerHeight js/window))
  (when-let [host (.getElementById js/document "sketch")]
    (set! (.-tabIndex host) 0)
    (.setAttribute host "aria-label" "Arithmetic defense: type answers and press Enter to fire")
    (.focus host))
  (reset! actions [])
  (q/frame-rate 60)
  (q/text-font "monospace")
  (let [width (q/width) height (q/height)]
    (assoc (new-game {:width width :height height
                     :lanes (max 2 (min 7 (int (/ width 160))))
                     :stars (mapv (fn [_] {:x (q/random 1) :y (q/random 1) :depth (q/random 0.2 1)})
                                  (range 180))}) :mode :ready)))

(defn wave-size [wave] (min 22 (+ 4 (* 2 wave))))

(defn spawn-enemy [state]
  (let [available (filterv (fn [lane]
                             (not-any? #(and (= lane (:lane %)) (< (:progress %) 0.18)) (:enemies state)))
                           (range (:lanes state)))]
    (if (empty? available)
      state
      (let [lane (nth available (random-int 0 (dec (count available))))
            enemy (merge (make-problem (:wave state))
                         {:id (:next-id state) :lane lane :progress 0
                          :speed (/ 1 (max 7 (- 19 (* (:wave state) 0.7))))})]
        (-> state (update :enemies conj enemy) (update :spawned inc)
            (update :next-id inc) (assoc :spawn-timer (max 0.7 (- 2.6 (* (:wave state) 0.12)))))))))

(defn target-enemy [state exact?]
  (when (seq (:input state))
    (first (sort-by :progress >
                    (filter #(if exact?
                               (= (:input state) (str (:answer %)))
                               (str/starts-with? (str (:answer %)) (:input state)))
                            (:enemies state))))))

(defn fire-answer [state]
  (if-let [enemy (target-enemy state true)]
    (let [combo (inc (:combo state))
          score (+ (:score state) 100 (* 10 (min combo 20)))]
      (swap! best-score max score)
      (-> state
          (assoc :input "" :score score :combo combo :message "DIRECT HIT" :message-timer 0.65)
          (update :enemies #(filterv (fn [e] (not= (:id e) (:id enemy))) %))
          (update :effects conj {:lane (:lane enemy) :progress (:progress enemy) :age 0 :kind :hit})))
    (if (empty? (:input state)) state
      (assoc state :combo 0 :message "NO MATCH — TRY AGAIN" :message-timer 1.2))))

(defn handle-action [state key]
  (cond
    (= key "p") (case (:mode state) :playing (assoc state :mode :paused)
                      :paused (assoc state :mode :playing :last-time nil)
                      :ready (new-game state) :over (new-game state) state)
    (= key "P") (handle-action state "p")
    (and (= key "Enter") (contains? #{:ready :over} (:mode state))) (new-game state)
    (not= :playing (:mode state)) state
    (= key "Enter") (fire-answer state)
    (= key "Backspace") (update state :input #(subs % 0 (max 0 (dec (count %)))))
    (and (re-matches #"[0-9]" key) (< (count (:input state)) 4))
    (update state :input #(if (= % "0") key (str % key)))
    :else state))

(defn advance-game [state dt]
  (let [enemies (mapv #(update % :progress + (* dt (:speed %))) (:enemies state))
        escaped (count (filter #(>= (:progress %) 1) enemies))
        shields (max 0 (- (:shields state) escaped))
        advanced (-> state
                     (assoc :enemies (filterv #(< (:progress %) 1) enemies) :shields shields)
                     (update :spawn-timer - dt)
                     (update :clock + dt)
                     (update :flash #(max 0 (- % dt)))
                     (update :message-timer #(max 0 (- % dt)))
                     (update :effects #(->> % (map (fn [effect] (update effect :age + dt)))
                                             (filter (fn [effect] (< (:age effect) 0.65))) vec)))
        advanced (if (pos? escaped) (assoc advanced :combo 0 :flash 0.35) advanced)]
    (cond
      (zero? shields) (assoc advanced :mode :over :input "")
      (and (>= (:spawned advanced) (wave-size (:wave advanced))) (empty? (:enemies advanced)))
      (let [waiting (update advanced :wave-timer + dt)]
        (if (> (:wave-timer waiting) 2)
          (-> waiting (update :wave inc) (assoc :spawned 0 :spawn-timer 0 :wave-timer 0 :input ""))
          waiting))
      (and (< (:spawned advanced) (wave-size (:wave advanced))) (<= (:spawn-timer advanced) 0))
      (spawn-enemy advanced)
      :else advanced)))

(defn resize-state [state width height]
  (let [lanes (max 2 (min 7 (int (/ width 160))))
        remap (fn [entity]
                (update entity :lane #(min (dec lanes) (int (* lanes (/ (+ % 0.5) (:lanes state)))))))]
    (-> state
        (assoc :width width :height height :lanes lanes)
        (update :enemies #(mapv remap %))
        (update :effects #(mapv remap %)))))

(defn update-state [state]
  ;; Quil does not forward p5's windowResized callback; resize in the draw loop.
  (when (or (not= (q/width) (.-innerWidth js/window))
            (not= (q/height) (.-innerHeight js/window)))
    (q/resize-sketch (.-innerWidth js/window) (.-innerHeight js/window)))
  (let [now (/ (q/millis) 1000)
        dt (min 0.05 (max 0 (- now (or (:last-time state) now))))
        pending @actions]
    (reset! actions [])
    (let [state (if (or (not= (:width state) (q/width)) (not= (:height state) (q/height)))
                  (resize-state state (q/width) (q/height)) state)
          state (if (:menu-visible? state) state (reduce handle-action state pending))
          state (if (and (= :playing (:mode state)) (not (:menu-visible? state)))
                  (advance-game state dt) state)]
      (when-let [button (.getElementById js/document "venture-pause")]
        (set! (.-textContent button) (case (:mode state) :paused "Resume" :ready "Start" :over "Replay" "Pause")))
      (assoc state :last-time now))))

(defn draw-background [state]
  (q/background 4 13 20)
  (q/stroke-weight 1)
  (q/stroke 19 47 53 95)
  (let [offset (mod (* (:clock state) 18) 44)]
    (doseq [x (range 0 (:width state) 44)] (q/line x 0 x (:height state)))
    (doseq [y (range -44 (:height state) 44)] (q/line 0 (+ y offset) (:width state) (+ y offset))))
  (q/no-stroke)
  (doseq [{:keys [x y depth]} (:stars state)]
    (q/fill 150 207 214 (+ 35 (* depth 110)))
    (let [py (mod (+ (* y (:height state)) (* (:clock state) depth 22)) (:height state))]
      (q/ellipse (* x (:width state)) py (* depth 2) (* depth 2)))))

(defn draw-ship [state]
  (let [x (/ (:width state) 2) y (ship-y state)]
    (q/no-stroke)
    (q/fill 49 239 215 15)
    (q/ellipse x y 88 88)
    (q/stroke 102 255 226)
    (q/stroke-weight 1.5)
    (q/fill 10 47 56)
    (q/triangle x (- y 20) (- x 19) (+ y 15) (+ x 19) (+ y 15))
    (q/line x (- y 8) x (+ y 10))
    (q/no-stroke)
    (q/fill 143 255 230 160)
    (q/triangle (- x 6) (+ y 17) (+ x 6) (+ y 17) x (+ y 29 (* 4 (Math/sin (* (:clock state) 18)))))))

(defn draw-enemy [state enemy targeted?]
  (let [x (lane-x state (:lane enemy)) y (enemy-y state enemy)
        color (if targeted? [133 255 227] [245 157 63])]
    (q/push-matrix)
    (q/translate x y)
    (q/rotate (+ (* (:clock state) 0.35) (:id enemy)))
    (q/no-stroke)
    (apply q/fill (conj color 12))
    (q/ellipse 0 0 56 56)
    (apply q/stroke (conj color 215))
    (q/stroke-weight 1.4)
    (q/no-fill)
    (q/begin-shape)
    (doseq [i (range 6)]
      (let [angle (* i (/ (* 2 Math/PI) 6))]
        (q/vertex (* 15 (Math/cos angle)) (* 15 (Math/sin angle)))))
    (q/end-shape :close)
    (q/line -8 0 8 0)
    (q/line 0 -8 0 8)
    (q/pop-matrix)
    (q/text-size 16)
    (let [label (:equation enemy) width (+ 20 (q/text-width label))]
      (q/no-stroke)
      (q/fill 3 12 18 230)
      (q/rect (- x (/ width 2)) (+ y 23) width 27 4)
      (apply q/fill color)
      (q/text-align :center :center)
      (q/text label x (+ y 36)))))

(defn draw-effects [state]
  (doseq [{:keys [lane progress age]} (:effects state)]
    (let [x (lane-x state lane) y (enemy-y state {:progress progress})
          alpha (* 255 (max 0 (- 1 (/ age 0.65))))]
      (when (< age 0.16)
        (q/stroke 128 255 223 (* 230 (- 1 (/ age 0.16))))
        (q/stroke-weight 2)
        (q/line (/ (:width state) 2) (- (ship-y state) 18) x y))
      (q/no-fill)
      (q/stroke 247 188 85 alpha)
      (q/stroke-weight 1)
      (q/ellipse x y (+ 12 (* age 95)) (+ 12 (* age 95)))
      (doseq [i (range 10)]
        (let [angle (* i (/ (* 2 Math/PI) 10)) radius (+ 10 (* age 95))]
          (q/line (+ x (* radius (Math/cos angle))) (+ y (* radius (Math/sin angle)))
                  (+ x (* (+ radius 8) (Math/cos angle))) (+ y (* (+ radius 8) (Math/sin angle)))))))))

(defn draw-hud [state]
  (q/text-align :right :top)
  (q/text-size 12)
  (q/no-stroke)
  (q/fill 175 218 220)
  (q/text (str "SCORE " (:score state) "  /  WAVE " (:wave state)) (- (:width state) 18) 65)
  (q/text-align :left :top)
  (q/text (str "SHIELDS " (apply str (repeat (:shields state) "◆"))) 18 65)
  (q/stroke 61 117 126 100)
  (q/line 18 91 (- (:width state) 18) 91)
  (q/text-align :center :center)
  (q/no-stroke)
  (q/text-size 24)
  (q/fill 180 255 235)
  (q/text (str (if (seq (:input state)) (:input state) "_")) (/ (:width state) 2) (+ (ship-y state) 49))
  (q/text-size 10)
  (q/fill 99 149 157)
  (q/text (if (touch-controls? (:width state)) "ANSWER · TAP FIRE" "TYPE ANSWER · ENTER TO FIRE · P TO PAUSE")
          (/ (:width state) 2) (+ (ship-y state) 72))
  (when (pos? (:message-timer state))
    (q/fill 239 187 104)
    (q/text (:message state) (/ (:width state) 2) (- (ship-y state) 48)))
  (when (pos? (:wave-timer state))
    (q/text-size 18)
    (q/fill 168 247 222)
    (q/text "SECTOR CLEAR" (/ (:width state) 2) (/ (:height state) 2))))

(defn draw-overlay [state]
  (when (contains? #{:ready :paused :over} (:mode state))
    (q/no-stroke)
    (q/fill 3 10 17 220)
    (q/rect 0 94 (:width state) (- (:height state) 94))
    (let [cx (/ (:width state) 2)
          cy (+ 112 (/ (- (ship-y state) 112) 2))
          small? (< (:width state) 500)]
      (q/text-align :center :center)
      (q/fill 118 222 211)
      (q/text-size 11)
      (q/text "AD VENTURE / ARITHMETIC DEFENSE" cx (- cy 70))
      (q/fill 235 244 228)
      (q/text-size (if small? 27 44))
      (q/text (case (:mode state) :ready "MATH FLEET" :paused "PAUSED" :over "FLIGHT ENDED") cx (- cy 30))
      (q/text-size 12)
      (q/fill 148 186 192)
      (q/text (case (:mode state)
                :ready "Solve equations. Defend your ship."
                :paused "Take a breath. The fleet can wait."
                :over (str "Score " (:score state) "  ·  Best " @best-score)) cx (+ cy 8))
      (q/text-size 11)
      (q/fill 134 250 218)
      (q/text (case (:mode state)
                :ready "CLICK OR PRESS ENTER TO LAUNCH"
                :paused "PRESS P OR RESUME TO CONTINUE"
                :over "CLICK OR PRESS ENTER TO PLAY AGAIN") cx (+ cy 46)))))

(defn draw-state [state]
  (q/rect-mode :corner)
  (q/ellipse-mode :center)
  (draw-background state)
  (draw-ship state)
  (let [target (:id (target-enemy state false))]
    (doseq [enemy (:enemies state)] (draw-enemy state enemy (= target (:id enemy)))))
  (draw-effects state)
  (draw-hud state)
  (when (pos? (:flash state))
    (q/no-stroke)
    (q/fill 255 74 48 (* 80 (/ (:flash state) 0.35)))
    (q/rect 0 0 (:width state) (:height state)))
  (draw-overlay state))

(defn mouse-clicked [state]
  (if (and (not (:menu-visible? state)) (contains? #{:ready :over} (:mode state)))
    (new-game state) state))

(registry/def-sketch "Ad Venture" '(99 230 209)
  {:host "sketch" :setup setup :update update-state :draw draw-state
   :mouse-clicked mouse-clicked :size [menu/w menu/h]
   :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
