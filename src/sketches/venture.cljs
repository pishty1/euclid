(ns sketches.venture
  (:require [clojure.string :as str]
            [quil.core :as q :include-macros true]
            [quil.middleware :as m]
            [registry :as registry]
            [menu :as menu]
            ["../rendering/venture_gpu.js" :as gpu]
            ["../rendering/venture_audio.js" :as audio]))

(defonce actions (atom []))
(defonce best-score (atom 0))

(defn active? []
  (= "Add Venture" (:name (registry/get-sketch @menu/selected-sketch))))

(defn enqueue! [key]
  (when (and (active?) (not @menu/menu-visible)
             (or (not (audio/settingsOpen)) (contains? #{"p" "P"} key)))
    (when (contains? #{"Enter" "p" "P"} key) (audio/unlock))
    (swap! actions conj key)))

(defonce keyboard-handler
  (let [handler (fn [event]
                  (let [key (.-key event)]
                    (when (and (active?) (not @menu/menu-visible)
                               (not (and (.-closest (.-target event))
                                         (.closest (.-target event) "#venture-audio,#venture-mute")))
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
   body[data-sketch='Add Venture'] #venture-controls{display:block}
   #venture-controls button{pointer-events:auto;touch-action:manipulation;border:1px solid #70dace50;background:#081e25ed;color:#bdfcf0;border-radius:9px;cursor:pointer;font:500 13px system-ui,sans-serif}
   #venture-controls button:hover{background:#153a42}
   #venture-controls button:focus-visible{outline:2px solid #f1ba68;outline-offset:3px}
   #venture-controls .game-toolbar{position:absolute;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));display:flex;gap:6px;pointer-events:auto}
   #venture-controls .game-toolbar button{height:40px;padding:0 12px}
   #venture-audio{position:relative;pointer-events:auto;color:#bdfcf0;font-size:12px}
   #venture-audio summary{list-style:none;cursor:pointer;border:1px solid #70dace50;background:#081e25ed;border-radius:9px;padding:12px}
   #venture-audio summary:focus-visible{outline:2px solid #f1ba68;outline-offset:3px}
   #venture-audio .audio-settings{position:absolute;right:0;top:48px;width:210px;padding:14px;background:#081e25f5;border:1px solid #70dace50;border-radius:10px;box-shadow:0 8px 30px #0007}
   #venture-audio .audio-settings button{width:100%;margin-bottom:14px}
   #venture-audio label{display:block;margin-bottom:12px}
   #venture-audio input{display:block;width:100%;margin-top:8px;accent-color:#96ead7}
   #venture-audio-status{color:#86b6bd;font-size:11px}
   @media(max-width:400px){#venture-controls .game-toolbar{gap:4px}#venture-controls .game-toolbar button{padding:0 8px}#venture-audio summary{padding:12px 8px}}
   #venture-keypad{display:none;position:absolute;bottom:max(2px,env(safe-area-inset-bottom));left:max(4px,env(safe-area-inset-left));width:148px;padding:5px;box-sizing:border-box;border:1px solid #70dace40;border-radius:14px;background:#071923f2;box-shadow:0 6px 25px #0007;grid-template-columns:repeat(3,1fr);gap:3px;pointer-events:auto}
   #venture-keypad .command-display{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;min-height:18px;padding:0 2px 3px;color:#7aadaf;font:9px monospace;letter-spacing:.08em}
   #venture-keypad *{box-sizing:border-box}#venture-keypad{max-width:calc(100vw - 20px)}
   #venture-answer{color:#bdfcf0;font-size:16px;letter-spacing:0}
   #venture-keypad button{min-height:40px;font-size:17px}
   #venture-keypad .fire{background:#96ead7;color:#07232a;font-size:12px;font-weight:700}
   @media(pointer:coarse),(max-width:600px){#venture-keypad{display:grid}}
   @media(max-height:450px){#venture-keypad{width:180px;grid-template-columns:repeat(4,1fr);padding:5px;gap:3px}#venture-keypad button{min-height:40px;font-size:17px}#venture-keypad .command-display{min-height:18px;padding-bottom:3px}}
   @media(max-height:450px) and (min-width:600px){#venture-keypad{width:264px;grid-template-columns:repeat(6,1fr)}}
   @media(max-width:600px){body[data-sketch='Add Venture'] #euclid-nav .current-name{display:none}}
   body[data-sketch='Add Venture'] #sketch canvas{display:block}")

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
      (let [display (menu/element "div" "command-display" "COMMAND BASE")
            answer (menu/element "span" "" "_")]
        (set! (.-id answer) "venture-answer")
        (.appendChild display answer) (.appendChild keypad display))
      (doseq [[label key] [["1" "1"] ["2" "2"] ["3" "3"] ["4" "4"] ["5" "5"] ["6" "6"]
                          ["7" "7"] ["8" "8"] ["9" "9"] ["⌫" "Backspace"] ["0" "0"] ["FIRE" "Enter"]]]
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

(defn command-layout [state]
  {:width (min (- (:width state) 20) (if (<= (:height state) 450) (if (>= (:width state) 600) 264 180) 148))
   :height (if (<= (:height state) 450) (if (>= (:width state) 600) 116 159) 205)
   :bottom (max 2 (:safe-bottom state 0)) :left (max 4 (:safe-left state 0))})

(defn ship-x [state]
  (if (touch-controls? (:width state))
    (let [{:keys [width left]} (command-layout state) right (:safe-right state 0)]
      (min (- (:width state) right 48) (+ left width (/ (- (:width state) left width right) 2))))
    (/ (:width state) 2)))

(defn ship-y [state]
  (- (:height state) (:safe-bottom state 0) (if (touch-controls? (:width state)) 110 105)))

(defn viewport-insets []
  (let [style (.getComputedStyle js/window (.-documentElement js/document))
        value (fn [key] (let [n (js/parseFloat (.getPropertyValue style key))]
                          (if (js/Number.isFinite n) n 0)))]
    {:safe-top (value "--safe-top") :safe-bottom (value "--safe-bottom")
     :safe-left (value "--safe-left") :safe-right (value "--safe-right")}))

(defn enemy-y [state enemy]
  (let [top (+ 108 (:safe-top state 0))
        {:keys [width height bottom left]} (command-layout state)
        over-console? (and (touch-controls? (:width state))
                           (or (nil? (:lane enemy))
                               (<= (- (* (:width state) (/ (+ (:lane enemy) 0.5) (:lanes state))) 70)
                                   (+ left width 8))))
        end (if over-console? (min (- (ship-y state) 37) (- (:height state) height bottom 78))
                (- (ship-y state) 37))]
    (+ top (* (:progress enemy) (max 20 (- end top))))))

(defn lane-x [state lane]
  (* (:width state) (/ (+ lane 0.5) (:lanes state))))

(defn random-int [low high]
  (+ low (int (q/random (inc (- high low))))))

(defn make-problem [wave]
  (let [limit (min 30 (+ 12 (* wave 2)))
        a (random-int 2 limit) b (random-int 2 limit)
        ;; Mixed operations from launch, with a gentler bias in the first wave.
        operations (if (= wave 1) [:add :subtract :add :subtract :multiply :divide]
                       [:add :subtract :multiply :divide])
        op (nth operations (random-int 0 (dec (count operations))))
        factor-a (random-int 2 (min 12 (+ wave 4)))
        factor-b (random-int 2 (min 12 (+ wave 4)))]
    (assoc (case op
      :add {:equation (str a " + " b) :answer (+ a b)}
      :subtract {:equation (str (max a b) " − " (min a b)) :answer (Math/abs (- a b))}
      :multiply {:equation (str factor-a " × " factor-b) :answer (* factor-a factor-b)}
      :divide {:equation (str (* factor-a factor-b) " ÷ " factor-a) :answer factor-b}) :operation op)))

(def weapons
  {:add {:name "PULSE BURST" :duration 0.55 :id 0}
   :subtract {:name "RAIL SHOT" :duration 0.22 :id 1}
   :multiply {:name "SPREAD BOLTS" :duration 0.65 :id 2}
   :divide {:name "TWIN HELIX" :duration 0.75 :id 3}})

(defn new-game [state]
  (merge state {:mode :playing :wave 1 :score 0 :combo 0 :shields 3
                :enemies [] :effects [] :spawned 0 :spawn-timer 0
                :next-id 0 :input "" :message "" :message-timer 0
                :ship-angle 0 :aim-target nil :aim-until 0
                :wave-timer 0 :clock 0 :flash 0 :last-time nil}))

(defn canvas-height []
  (let [host (.getElementById js/document "sketch")]
    (max (.-innerHeight js/window) (if host (.-clientHeight host) 0))))

(defn setup []
  (init-controls!)
  (q/resize-sketch (.-innerWidth js/window) (canvas-height))
  (when-let [host (.getElementById js/document "sketch")]
    (set! (.-tabIndex host) 0)
    (.setAttribute host "aria-label" "Arithmetic defense: type answers and press Enter to fire")
    (.focus host))
  (reset! actions [])
  (q/frame-rate 60)
  (q/text-font "monospace")
  (audio/init (.getElementById js/document "sketch") (.querySelector js/document "#venture-controls .game-toolbar"))
  (let [width (q/width) height (.-innerHeight js/window)
        overlay (.querySelector js/document "#sketch canvas:not([data-venture-gpu])")]
    (assoc (new-game (merge (viewport-insets) {:width width :height height
                     :gpu (when overlay (gpu/create (.getElementById js/document "sketch") overlay))
                     :lanes (max 2 (min 7 (int (/ width 160))))
                     :stars (mapv (fn [_] {:x (q/random 1) :y (q/random 1) :depth (q/random 0.2 1)})
                                  (range 180))})) :mode :ready)))

(defn wave-size [wave] (min 22 (+ 4 (* 2 wave))))

(defn spawn-enemy [state]
  (let [available (filterv (fn [lane]
                             (not-any? #(and (= lane (:lane %))
                                             (or (< (:progress %) 0.18)
                                                 (and (touch-controls? (:width state))
                                                      (< (- (enemy-y state %) 108 (:safe-top state 0)) 90))))
                                       (:enemies state)))
                           (range (:lanes state)))]
    (if (empty? available)
      state
      (let [lane (nth available (random-int 0 (dec (count available))))
            enemy (merge (make-problem (:wave state))
                         {:id (:next-id state) :lane lane :progress 0
                          :speed (/ 1 (max 7 (- 18 (* (:wave state) 0.7))))})]
        (-> state (update :enemies conj enemy) (update :spawned inc)
            (update :next-id inc) (assoc :spawn-timer (max 0.7 (- 2.4 (* (:wave state) 0.12)))))))))

(defn target-enemy [state exact?]
  (when (seq (:input state))
    (first (sort-by :progress >
                    (filter #(if exact?
                               (= (:input state) (str (:answer %)))
                               (str/starts-with? (str (:answer %)) (:input state)))
                            (:enemies state))))))

(defn aim-angle [state enemy]
  (if enemy
    (Math/atan2 (- (lane-x state (:lane enemy)) (ship-x state))
                (- (ship-y state) (enemy-y state enemy)))
    0))

(defn update-aim [state dt]
  (let [target (if (< (:clock state) (:aim-until state)) (:aim-target state)
                  (target-enemy state false))
        desired (aim-angle state target) current (:ship-angle state)
        difference (Math/atan2 (Math/sin (- desired current)) (Math/cos (- desired current)))]
    (assoc state :ship-angle (+ current (* difference (- 1 (Math/exp (* -14 dt))))))))

(defn fire-answer [state]
  (if-let [enemy (target-enemy state true)]
    (let [combo (inc (:combo state))
          score (+ (:score state) 100 (* 10 (min combo 20)))]
      (swap! best-score max score)
      (audio/play "player" (name (or (:operation enemy) :add)))
      (-> state
          (assoc :input "" :score score :combo combo :message "DIRECT HIT" :message-timer 0.65
                 :ship-angle (aim-angle state enemy) :aim-target (select-keys enemy [:lane :progress])
                 :aim-until (+ (:clock state) 0.45))
          (update :enemies #(filterv (fn [e] (not= (:id e) (:id enemy))) %))
          (update :effects conj {:lane (:lane enemy) :progress (:progress enemy) :age 0
                                :operation (or (:operation enemy) :add) :duration 0.18 :kind :hit})))
    (if (empty? (:input state)) state
      (let [attacker (or (target-enemy state false) (first (sort-by :progress > (:enemies state))))
            operation (or (:operation attacker) :add)
            weapon (get weapons operation)
            state (assoc state :input "" :combo 0
                               :message (if attacker (str "WRONG — " (:name weapon) " INCOMING") "NO TARGETS — TRY AGAIN")
                               :message-timer 1.2)]
        (if attacker
          (do (audio/play "enemy" (name operation))
            (update state :effects conj {:lane (:lane attacker) :progress (:progress attacker)
                                      :operation operation :duration (:duration weapon)
                                      :age 0 :kind :incoming}))
          state)))))

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

(defn advance-effects [effects dt]
  (doseq [effect effects
          :when (and (= :hit (:kind effect)) (< (:age effect) (:duration effect))
                     (>= (+ (:age effect) dt) (:duration effect)))]
    (audio/play "blast" (name (:operation effect))))
  (let [effects (mapv #(update % :age + dt) effects)
        impacts (count (filter #(and (= :incoming (:kind %)) (>= (:age %) (:duration %))) effects))]
    {:impacts impacts
     :effects (->> effects
                   (map #(if (and (= :incoming (:kind %)) (>= (:age %) (:duration %)))
                           (assoc % :kind :ship-hit :age (- (:age %) (:duration %))) %))
                   (filter #(< (:age %) (if (= :hit (:kind %)) 1.3
                                           (if (= :incoming (:kind %)) (:duration %) 1.1)))) vec)}))

(defn advance-game [state dt]
  (let [enemies (mapv #(update % :progress + (* dt (:speed %))) (:enemies state))
        escaped (count (filter #(>= (:progress %) 1) enemies))
        {:keys [effects impacts]} (advance-effects (:effects state) dt)
        shields (max 0 (- (:shields state) escaped impacts))
        advanced (-> state
                     (assoc :enemies (filterv #(< (:progress %) 1) enemies) :shields shields :effects effects)
                     (update :spawn-timer - dt)
                     (update :clock + dt)
                     (update :flash #(max 0 (- % dt)))
                     (update :message-timer #(max 0 (- % dt))))
        advanced (if (pos? (+ escaped impacts))
                   (do (audio/play "shield" "") (assoc advanced :combo 0 :flash 0.35)) advanced)]
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
        (merge (viewport-insets))
        (assoc :width width :height height :lanes lanes)
        (update :aim-target #(when % (remap %)))
        (update :enemies #(mapv remap %))
        (update :effects #(mapv remap %)))))

(defn update-state [state]
  ;; Quil does not forward p5's windowResized callback; resize in the draw loop.
  (when (or (not= (q/width) (.-innerWidth js/window))
            (not= (q/height) (canvas-height)))
    (q/resize-sketch (.-innerWidth js/window) (canvas-height)))
  (let [now (/ (q/millis) 1000)
        dt (min 0.05 (max 0 (- now (or (:last-time state) now))))
        audio-open? (audio/settingsOpen)
        pending (if audio-open? (filter #(contains? #{"p" "P"} %) @actions) @actions)]
    (reset! actions [])
    (let [state (if (or (not= (:width state) (q/width)) (not= (:height state) (.-innerHeight js/window)))
                  (resize-state state (q/width) (.-innerHeight js/window)) state)
          state (if (:menu-visible? state) state (reduce handle-action state pending))
          state (assoc state :audio-open? audio-open?)
          state (if (or (:menu-visible? state) audio-open?) state
                  (case (:mode state)
                    :playing (update-aim (advance-game state dt) dt)
                    :over (-> state
                              (assoc :effects (:effects (advance-effects (:effects state) dt)))
                              (update :flash #(max 0 (- % dt))))
                    state))]
      (when-let [button (.getElementById js/document "venture-pause")]
        (set! (.-textContent button) (case (:mode state) :paused "Resume" :ready "Start" :over "Replay" "Pause")))
      (when-let [display (.getElementById js/document "venture-answer")]
        (set! (.-textContent display) (if (seq (:input state)) (:input state) "_")))
      (audio/sync (name (:mode state)) (:wave state) (boolean (:menu-visible? state)) (pos? (:wave-timer state)))
      (assoc state :last-time now))))

(defn draw-background [state]
  (q/background 4 13 20)
  (q/stroke-weight 1)
  (q/stroke 19 47 53 95)
  (let [offset (mod (* (:clock state) 18) 44)]
    (doseq [x (range 0 (:width state) 44)] (q/line x 0 x (q/height)))
    (doseq [y (range -44 (q/height) 44)] (q/line 0 (+ y offset) (:width state) (+ y offset))))
  (q/no-stroke)
  (doseq [{:keys [x y depth]} (:stars state)]
    (q/fill 150 207 214 (+ 35 (* depth 110)))
    (let [py (mod (+ (* y (q/height)) (* (:clock state) depth 22)) (q/height))]
      (q/ellipse (* x (:width state)) py (* depth 2) (* depth 2)))))

(defn draw-ship [state]
  (let [x (ship-x state) y (ship-y state)]
    (q/push-matrix) (q/translate x y) (q/rotate (:ship-angle state))
    (q/no-stroke)
    (q/fill 49 239 215 15)
    (q/ellipse 0 0 88 88)
    (q/stroke 102 255 226)
    (q/stroke-weight 1.5)
    (q/fill 10 47 56)
    (q/triangle 0 -24 -19 15 19 15)
    (q/line 0 -8 0 10)
    (q/no-stroke)
    (q/fill 143 255 230 160)
    (q/triangle -6 17 6 17 0 (+ 29 (* 4 (Math/sin (* (:clock state) 18)))))
    (q/pop-matrix)))

(def enemy-styles
  {:add {:color [245 177 76] :symbol "+"}
   :subtract {:color [255 113 142] :symbol "−"}
   :multiply {:color [183 145 255] :symbol "×"}
   :divide {:color [99 197 255] :symbol "÷"}})

(defn outline [points]
  (q/begin-shape)
  (doseq [[x y] points] (q/vertex x y))
  (q/end-shape :close))

(defn draw-enemy-body [operation clock id]
  ;; Each operation has a distinct hull, armour layout, and weapon mounts.
  (let [color (:color (get enemy-styles operation (:add enemy-styles)))
        plate! (fn [points]
                 (q/fill 13 26 39) (apply q/stroke (conj color 220))
                 (q/stroke-weight 1.2) (outline points))
        glow! (fn [x y radius]
                (q/no-stroke) (apply q/fill (conj color 22))
                (q/ellipse x y (* radius 3) (* radius 3))
                (apply q/fill (conj color (+ 150 (* 70 (Math/sin (+ (* clock 5) id))))))
                (q/ellipse x y radius radius))]
    (case operation
      :add
      (do
        (plate! [[-7 -22] [7 -22] [10 -10] [23 -7] [26 0] [23 7] [10 10]
                 [7 24] [-7 24] [-10 10] [-23 7] [-26 0] [-23 -7] [-10 -10]])
        (doseq [[x y] [[0 -16] [18 0] [0 18] [-18 0]]]
          (q/no-fill) (apply q/stroke (conj color 120)) (q/ellipse x y 10 10)
          (glow! x y 4))
        (plate! [[-9 -9] [9 -9] [9 9] [-9 9]]))
      :subtract
      (do
        (plate! [[-28 -5] [-18 -16] [-6 -9] [0 -13] [6 -9] [18 -16] [28 -5]
                 [20 9] [7 13] [5 24] [-5 24] [-7 13] [-20 9]])
        (doseq [sign [-1 1]]
          (plate! [[(* sign 8) -6] [(* sign 20) -10] [(* sign 23) 2] [(* sign 8) 6]])
          (glow! (* sign 15) -12 3))
        (q/stroke-weight 2) (apply q/stroke color)
        (q/line -2 11 -2 24) (q/line 2 11 2 24))
      :multiply
      (do
        (doseq [[sx sy] [[-1 -1] [1 -1] [-1 1] [1 1]]]
          (plate! (mapv (fn [[x y]] [(* sx x) (* sy y)])
                        [[6 4] [19 9] [25 24] [12 19] [4 6]]))
          (glow! (* sx 18) (* sy 17) 4))
        (plate! [[0 -12] [12 0] [0 12] [-12 0]]))
      :divide
      (let [spread (+ 16 (* 1.5 (Math/sin (+ (* clock 2) id))))]
        (q/stroke-weight 2) (apply q/stroke (conj color 120))
        (q/line 0 (- spread) 0 spread)
        (doseq [y [(- spread) spread]]
          (plate! [[-8 (- y 7)] [8 (- y 7)] [11 y] [8 (+ y 7)] [-8 (+ y 7)] [-11 y]])
          (glow! 0 y 5))
        (plate! [[-24 0] [-15 -7] [15 -7] [24 0] [15 7] [-15 7]])
        (q/stroke-weight 1) (apply q/stroke color)
        (q/line -19 0 -10 0) (q/line 10 0 19 0))
      nil)))

(defn draw-enemy [state enemy targeted?]
  (let [x (lane-x state (:lane enemy)) y (enemy-y state enemy)
        operation (:operation enemy)
        {:keys [color symbol]} (get enemy-styles operation (:add enemy-styles))]
    (q/push-matrix)
    (q/translate x y)
    (q/rotate (* 0.045 (Math/sin (+ (* (:clock state) 1.8) (:id enemy)))))
    (q/no-stroke)
    (apply q/fill (conj color 12))
    (q/ellipse 0 0 64 64)
    ;; Keep the operation's own color when targeting; use a mint ring instead.
    (when targeted?
      (q/no-fill)
      (q/stroke 133 255 227 220)
      (q/stroke-weight 1.5)
      (q/ellipse 0 0 64 64))
    (apply q/stroke (conj color 230))
    (q/stroke-weight 1.4)
    (q/fill 5 17 26 235)
    (draw-enemy-body operation (:clock state) (:id enemy))
    (q/no-stroke)
    (apply q/fill color)
    (q/text-size 13)
    (q/text-align :center :center)
    (q/text symbol 0 0)
    (q/pop-matrix)
    (q/text-size 16)
    (let [label (:equation enemy) width (+ 20 (q/text-width label))]
      (q/no-stroke)
      (q/fill 3 12 18 230)
      (q/rect (- x (/ width 2)) (+ y 28) width 27 4)
      (apply q/fill (if targeted? [133 255 227] color))
      (q/text-align :center :center)
      (q/text label x (+ y 41))
      (q/text-size 8) (q/fill 129 164 178)
      (q/text (:name (get weapons operation)) x (+ y 62)))))

(defn effect-points [state {:keys [lane progress kind]}]
  (let [enemy [(lane-x state lane) (enemy-y state {:progress progress :lane lane})]
        center [(ship-x state) (ship-y state)]
        angle (aim-angle state {:lane lane :progress progress})
        muzzle [(+ (first center) (* 24 (Math/sin angle)))
                (- (second center) (* 24 (Math/cos angle)))]]
    (if (= kind :hit) [muzzle enemy] [enemy center])))

(defn gpu-effect [state {:keys [age duration operation kind] :as effect}]
  (let [[[sx sy] [tx ty]] (effect-points state effect)]
    (into-array [sx sy tx ty age duration (:id (get weapons operation))
                 ({:hit 0 :incoming 1 :ship-hit 2} kind)])))

(defn draw-effects-canvas [state]
  (doseq [{:keys [age duration operation kind] :as effect} (:effects state)]
    (let [[[sx sy] [tx ty]] (effect-points state effect)
          color (:color (get enemy-styles operation (:add enemy-styles)))
          t (min 1 (/ age duration))
          dx (- tx sx) dy (- ty sy) distance (max 1 (Math/hypot dx dy))
          nx (/ (- dy) distance) ny (/ dx distance)
          incoming? (= kind :incoming)]
      (when (and (not= kind :ship-hit) (< age duration))
        (apply q/stroke (if incoming? color [128 255 223])) (q/stroke-weight 2)
        (if (or (not incoming?) (= operation :subtract))
          (q/line sx sy (+ sx (* t dx)) (+ sy (* t dy)))
          (doseq [i (range (case operation :add 3 :multiply 4 :divide 2 1))]
            (let [at (max 0 (- t (if (= operation :add) (* i 0.04) 0)))
                  offset (case operation
                           :multiply (* (- i 1.5) 10 (Math/sin (* t Math/PI)))
                           :divide (* (if (zero? i) -1 1) 9 (Math/sin (* t 25)) (Math/sin (* t Math/PI))) 0)
                  x (+ sx (* at dx) (* nx offset)) y (+ sy (* at dy) (* ny offset))]
              (q/no-stroke) (apply q/fill (conj color 30)) (q/ellipse x y 16 16)
              (apply q/fill color) (q/ellipse x y 5 5)))))
      (let [blast-age (if (= kind :ship-hit) age (- age duration))]
        (when (and (not incoming?) (<= 0 blast-age 1.1))
          (let [fade (Math/pow (max 0 (- 1 (/ blast-age 1.1))) 2)
                radius (+ 8 (* 90 (- 1 (Math/exp (* -3.5 blast-age)))))]
            (q/no-stroke) (apply q/fill (conj color (* 45 fade))) (q/ellipse tx ty 90 90)
            (q/fill 255 248 221 (* 255 (Math/exp (* -18 blast-age))))
            (q/ellipse tx ty 34 34)
            (q/no-fill) (apply q/stroke (conj color (* 220 fade))) (q/stroke-weight 1)
            (q/ellipse tx ty (* radius 2) (* radius 2))
            (q/ellipse tx ty (* radius 1.25) (* radius 1.25))
            (doseq [i (range 24)]
              (let [angle (+ (* i 2.39996) (if (= operation :divide) (* blast-age 6) 0))
                    travel (* radius (+ 0.35 (* 0.1 (mod i 7))))
                    x (+ tx (* travel (Math/cos angle))) y (+ ty (* travel (Math/sin angle)))]
                (if (zero? (mod i 3))
                  (do (q/push-matrix) (q/translate x y) (q/rotate (+ angle (* blast-age 5)))
                      (apply q/fill (conj color (* 110 fade)))
                      (outline [[-4 0] [0 -2] [4 0] [0 2]]) (q/no-fill) (q/pop-matrix))
                  (q/line x y (+ x (* 7 (Math/cos angle))) (+ y (* 7 (Math/sin angle)))))))))))))

(defn draw-effects [state]
  (let [effects (if (or (:menu-visible? state) (:audio-open? state) (= :paused (:mode state))) [] (:effects state))]
    (when-not (gpu/draw (:gpu state) (:width state) (:height state)
                       (into-array (map #(gpu-effect state %) effects)))
      (draw-effects-canvas (assoc state :effects effects)))))

(defn draw-hud [state]
  (q/text-align :right :top)
  (q/text-size 12)
  (q/no-stroke)
  (q/fill 175 218 220)
  (q/text (str "SCORE " (:score state) "  /  WAVE " (:wave state)) (- (:width state) 18 (:safe-right state 0)) (+ 65 (:safe-top state 0)))
  (q/text-align :left :top)
  (q/text (str "SHIELDS " (apply str (repeat (:shields state) "◆"))) (+ 18 (:safe-left state 0)) (+ 65 (:safe-top state 0)))
  (q/text-size 9) (q/fill 99 149 157)
  (q/text (str "COMBAT / " (gpu/status (:gpu state))) (+ 18 (:safe-left state 0)) (+ 80 (:safe-top state 0)))
  (q/stroke 61 117 126 100)
  (q/line 18 (+ 91 (:safe-top state 0)) (- (:width state) 18) (+ 91 (:safe-top state 0)))
  (q/text-align :center :center)
  (q/no-stroke)
  (q/text-size 24)
  (q/fill 180 255 235)
  (q/text (str (if (seq (:input state)) (:input state) "_")) (ship-x state) (+ (ship-y state) 49))
  (q/text-size 10)
  (q/fill 99 149 157)
  (q/text (if (touch-controls? (:width state)) "ANSWER · TAP FIRE" "TYPE ANSWER · ENTER TO FIRE · P TO PAUSE")
          (ship-x state) (+ (ship-y state) 72))
  (when (pos? (:message-timer state))
    (q/fill 239 187 104)
    (q/text (:message state) (/ (:width state) 2)
            (if (touch-controls? (:width state))
              (- (:height state) (:height (command-layout state)) (:bottom (command-layout state)) 22)
              (- (ship-y state) 48))))
  (when (pos? (:wave-timer state))
    (q/text-size 18)
    (q/fill 168 247 222)
    (q/text "SECTOR CLEAR" (/ (:width state) 2) (/ (:height state) 2))))

(defn draw-overlay [state]
  (let [view (if (and (:audio-open? state) (= :playing (:mode state))) :audio-settings (:mode state))]
  (when (contains? #{:ready :paused :over :audio-settings} view)
    (q/no-stroke)
    (q/fill 3 10 17 220)
    (q/rect 0 (+ 94 (:safe-top state 0)) (:width state) (- (:height state) 94 (:safe-top state 0)))
    (let [cx (/ (:width state) 2)
          cy (+ 112 (/ (- (ship-y state) 112) 2))
          small? (< (:width state) 500)]
      (q/text-align :center :center)
      (q/fill 118 222 211)
      (q/text-size 11)
      (q/text "ADD VENTURE / ARITHMETIC DEFENSE" cx (- cy 70))
      (q/fill 235 244 228)
      (q/text-size (if small? 27 44))
      (q/text (case view :ready "MATH FLEET" :paused "PAUSED" :over "FLIGHT ENDED" :audio-settings "AUDIO SETTINGS") cx (- cy 30))
      (q/text-size 12)
      (q/fill 148 186 192)
      (q/text (case view
                :ready "Wrong answers provoke enemy fire."
                :paused "Take a breath. The fleet can wait."
                :over (str "Score " (:score state) "  ·  Best " @best-score)
                :audio-settings "Gameplay paused while you adjust sound.") cx (+ cy 8))
      (when (= :ready (:mode state))
        (q/text-size 10)
        (q/text "Solve to fire. Each enemy hit costs one shield." cx (+ cy 27)))
      (q/text-size 11)
      (q/fill 134 250 218)
      (q/text (case view
                :ready "CLICK OR PRESS ENTER TO LAUNCH"
                :paused "PRESS P OR RESUME TO CONTINUE"
                :over "CLICK OR PRESS ENTER TO PLAY AGAIN"
                :audio-settings "CLOSE AUDIO TO CONTINUE") cx (+ cy 46))))))

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
  (if (and (not (:menu-visible? state)) (not (audio/settingsOpen)) (contains? #{:ready :over} (:mode state)))
    (do (audio/unlock) (new-game state)) state))

(registry/def-sketch "Add Venture" '(99 230 209)
  {:host "sketch" :setup setup :update update-state :draw draw-state
   :mouse-clicked mouse-clicked :size [menu/w menu/h]
   :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
