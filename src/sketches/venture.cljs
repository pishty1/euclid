(ns sketches.venture
  (:require [clojure.string :as str]
            [quil.core :as q :include-macros true]
            [quil.middleware :as m]
            [registry :as registry]
            [viewport :as viewport]
            [menu :as menu]
            ["../rendering/venture_gpu.js" :as gpu]
            ["../rendering/venture_audio.js" :as audio]
            ["../rendering/venture_controls.js" :as controls]))

(defonce actions (atom []))
(defonce best-score (atom 0))

(defn active? []
  (= "Add Venture" (:name (registry/get-sketch @menu/selected-sketch))))

(defn enqueue! [key]
  (when (and (active?) (not @menu/menu-visible)
             (or (not (audio/settingsOpen)) (contains? #{"p" "P"} key)))
    (when (contains? #{"Enter" "p" "P" "continue" "restart" "arc" "nova" "q" "Q" "w" "W"} key) (audio/unlock))
    (swap! actions conj key)))

(defonce keyboard-handler
  (let [handler (fn [event]
                  (let [key (.-key event)]
                    (when (and (active?) (not @menu/menu-visible)
                               (not (and (.-closest (.-target event))
                                         (.closest (.-target event) "#venture-audio,#venture-mute,.command-display")))
                               (not (.-ctrlKey event)) (not (.-metaKey event))
                               (or (re-matches #"[0-9]" key)
                                   (contains? #{"Enter" "Backspace" "p" "P" "r" "R" "q" "Q" "w" "W"} key)))
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
   #venture-audio .audio-settings{position:absolute;right:0;top:48px;width:210px;padding:14px;box-sizing:border-box;max-height:calc(100dvh - 120px - env(safe-area-inset-top));overflow:auto;overscroll-behavior:contain;background:#081e25f5;border:1px solid #70dace50;border-radius:10px;box-shadow:0 8px 30px #0007}
   #venture-audio .audio-settings button{width:100%;margin-bottom:14px}
   #venture-audio label{display:block;margin-bottom:12px}
   #venture-audio input{display:block;width:100%;margin-top:8px;accent-color:#96ead7}
   #venture-audio select{display:block;width:100%;margin-top:8px;padding:8px;border:1px solid #70dace50;border-radius:7px;background:#102b32;color:#bdfcf0;font:inherit}
   #venture-audio-status{color:#86b6bd;font-size:11px}
   @media(max-width:400px){#venture-controls .game-toolbar{gap:4px}#venture-controls .game-toolbar button{padding:0 8px}#venture-audio summary{padding:12px 8px}}
   .venture-keypad{display:none;position:absolute;bottom:calc(max(2px,env(safe-area-inset-bottom)) + var(--keypad-lift,0px));left:max(4px,env(safe-area-inset-left));width:148px;padding:5px;box-sizing:border-box;border:1px solid #70dace40;border-radius:14px;background:#07192324;box-shadow:none;grid-template-columns:repeat(3,1fr);gap:6px;pointer-events:auto}
   .venture-keypad .command-display{grid-column:1/-1;display:flex;align-items:center;justify-content:center;min-height:18px;padding:0 2px 3px;color:#7aadaf;font:9px monospace;letter-spacing:.08em;touch-action:none;cursor:ns-resize;user-select:none}
   .venture-keypad .command-display::before{content:\"\";width:18px;height:3px;border-radius:3px;background:#bdfcf070}
   .venture-keypad .command-display:focus-visible{outline:2px solid #edc778;border-radius:4px}
   .venture-keypad *{box-sizing:border-box}.venture-keypad{max-width:calc(100vw - 20px)}
   #venture-answer{display:none;color:#bdfcf0;font-size:16px;letter-spacing:0}
   .venture-keypad button{min-height:40px;font-size:17px;background:#07192345;color:#bdfcf0;text-shadow:0 1px 3px #000,0 0 5px #000}
   .venture-keypad button:hover{background:#173b425c}
   .venture-keypad .fire{background:#96ead738;color:#c4fff1;font-size:12px;font-weight:700}
   @media(pointer:coarse),(max-width:600px){.venture-keypad{display:grid}}
   @media(max-height:450px){.venture-keypad{width:180px;grid-template-columns:repeat(4,1fr);padding:5px;gap:6px}.venture-keypad button{min-height:40px;font-size:17px}.venture-keypad .command-display{min-height:18px;padding-bottom:3px}}
   @media(max-height:450px) and (min-width:600px){.venture-keypad{width:264px;grid-template-columns:repeat(6,1fr)}}
   .venture-keypad[data-side=right]{left:auto;right:max(4px,env(safe-area-inset-right))}
   .venture-keypad[hidden]{display:none!important}
   .venture-keypad[data-layout=split]{width:56px;grid-template-columns:1fr;padding:4px;gap:8px}
   .venture-keypad[data-layout=split] .command-display{justify-content:center;font-size:10px}
   .venture-keypad[data-layout=split] #venture-answer{display:none}
   @media(max-height:450px){.venture-keypad[data-layout=split]{width:98px;grid-template-columns:repeat(2,1fr)}}
   @media(max-width:600px){body[data-sketch='Add Venture'] #euclid-nav .current-name{display:none}}
   #venture-controls[data-mode=over] .venture-keypad{display:none}
   #venture-specials{position:absolute;bottom:max(2px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:6px;pointer-events:auto;width:162px}
   #venture-specials[hidden]{display:none}
   #venture-specials button{flex:1;min-width:0;min-height:40px;padding:3px;font-size:10px;white-space:nowrap;background:#152b3dd9;border-color:#aac8ff80;color:#d4e5ff}
   #venture-specials .nova{background:#35203cd9;border-color:#efa9ff80;color:#f8d6ff}
   #venture-specials button:disabled{opacity:.35;cursor:default}
   #venture-recovery{position:absolute;top:min(calc(50% + 55px),calc(100% - 126px - env(safe-area-inset-bottom)));left:50%;transform:translateX(-50%);width:min(280px,calc(100vw - 32px));display:grid;gap:8px;pointer-events:auto;text-align:center}
   #venture-recovery[hidden]{display:none}
   #venture-recovery button{min-height:44px;padding:10px 14px;font-size:14px}
   #venture-recovery .power-on{background:#16443ded;border-color:#96ead7;color:#c4fff1}
   #venture-recovery small{color:#86b6bd;font-size:10px}
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
      (set! (.-className keypad) "venture-keypad")
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
      (let [display (menu/element "div" "command-display" " ")
            answer (menu/element "span" "" "_")]
        (set! (.-id answer) "venture-answer")
        (.appendChild display answer) (.appendChild keypad display))
      (doseq [[label key] [["1" "1"] ["2" "2"] ["3" "3"] ["4" "4"] ["5" "5"] ["6" "6"]
                          ["7" "7"] ["8" "8"] ["9" "9"] ["⌫" "Backspace"] ["0" "0"] ["FIRE" "Enter"]]]
        (let [button (menu/element "button" (if (= key "Enter") "fire" "") label)]
          (set! (.-type button) "button")
          (.setAttribute button "data-key" key)
          (.setAttribute button "aria-label" (case key "Backspace" "Delete last digit" "Enter" "Fire answer" label))
          (.addEventListener button "click" (fn [_] (enqueue! key)))
          ;; Avoid stealing focus from the game when a pointer taps the keypad.
          (.addEventListener button "mousedown" (fn [event] (.preventDefault event)))
          (.appendChild keypad button)))
      (let [specials (menu/element "div" "" nil)]
        (set! (.-id specials) "venture-specials")
        (set! (.-hidden specials) true)
        (.setAttribute specials "role" "group")
        (.setAttribute specials "aria-label" "Shield-powered special weapons")
        (doseq [[action label description] [["arc" "ARC 1◆" "Twin Arc: destroy two random enemies. Costs one shield; requires two shields."]
                                            ["nova" "NOVA 2◆" "Nova Strike: destroy three random enemies. Costs two shields; requires three shields."]]]
          (let [button (menu/element "button" action label)]
            (set! (.-id button) (str "venture-" action))
            (set! (.-type button) "button")
            (.setAttribute button "aria-label" description)
            (.setAttribute button "title" description)
            (.addEventListener button "click" (fn [_] (enqueue! action)))
            (.appendChild specials button)))
        (.appendChild controls specials))
      (let [choices (menu/element "div" "" nil)
            power (menu/element "button" "power-on" "Power on")
            restart (menu/element "button" "" "Restart from scratch")
            hint (menu/element "small" "" "New flight · 3 shields · score resets")]
        (set! (.-id choices) "venture-recovery")
        (set! (.-hidden choices) true)
        (.setAttribute choices "role" "group")
        (.setAttribute choices "aria-label" "Choose how to restart")
        (set! (.-id power) "venture-power-on")
        (doseq [[button action] [[power "continue"] [restart "restart"]]]
          (set! (.-type button) "button")
          (.addEventListener button "click" (fn [_] (enqueue! action)))
          (.appendChild choices button))
        (.appendChild choices hint)
        (.appendChild controls choices))
      (.appendChild controls toolbar)
      (.appendChild controls keypad)
      (doseq [event-name ["click" "mousedown" "mouseup" "touchstart" "touchend" "touchmove"]]
        (.addEventListener controls event-name (fn [event] (.stopPropagation event))))
      (.appendChild (.-body js/document) controls)
      (controls/init keypad (.querySelector keypad ".command-display")))))

(defn touch-controls? [width]
  (or (<= width 600) (.-matches (.matchMedia js/window "(pointer: coarse)"))))

(defn command-layout [state]
  (let [layout (controls/layout) short? (<= (:height state) 450)]
    {:layout layout
     :width (min (- (:width state) 20)
                 (if (= layout "split") (if short? 98 56)
                   (if short? (if (>= (:width state) 600) 264 180) 148)))
     :height (max (controls/padHeight)
                  (if (= layout "split") (if short? 175 319)
                    (if short? (if (>= (:width state) 600) 128 174) 217)))
     :bottom (+ (max 2 (:safe-bottom state 0)) (controls/lift))
     :left (max 4 (:safe-left state 0)) :right (max 4 (:safe-right state 0))}))

(defn ship-x [state]
  (if (touch-controls? (:width state))
    (let [{:keys [width left right layout]} (command-layout state)]
      (case layout
        "split" (/ (+ left (- (:width state) right)) 2)
        "right" (max (+ left 48) (+ left (/ (- (:width state) left width right) 2)))
        (min (- (:width state) right 48) (+ left width (/ (- (:width state) left width right) 2)))))
    (/ (:width state) 2)))

(defn ship-y [state]
  (- (:height state) (:safe-bottom state 0) (if (touch-controls? (:width state)) 130 125)))

(defn viewport-insets []
  (let [style (.getComputedStyle js/window (.-documentElement js/document))
        value (fn [key] (let [n (js/parseFloat (.getPropertyValue style key))]
                          (if (js/Number.isFinite n) n 0)))]
    {:safe-top (value "--safe-top") :safe-bottom (value "--safe-bottom")
     :safe-left (value "--safe-left") :safe-right (value "--safe-right")}))

(defn enemy-y [state enemy]
  ;; Controls are overlays: enemy flight never depends on their layout/position.
  (let [top (+ 108 (:safe-top state 0)) end (+ (:height state) 34)]
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

(def stack-spacing 54)

(defn stack-steps [enemy]
  (or (:stack-steps enemy)
      (when (:stack-operand enemy)
        [{:operation (:operation enemy) :operand (:stack-operand enemy)}]) []))

(defn answer-limit [wave]
  (max (* 2 (min 30 (+ 12 (* wave 2))))
       (Math/pow (min 12 (+ wave 4)) 2)))

(defn stack-problem [problem wave]
  (let [result (:answer problem)
        op (nth [:add :subtract :multiply :divide] (random-int 0 3))
        operand (case op
                  :subtract (random-int 1 (max 1 (min 9 result)))
                  :divide (let [divisors (filterv #(zero? (mod result %)) (range 2 10))]
                            (when (seq divisors) (nth divisors (random-int 0 (dec (count divisors))))))
                  :multiply (random-int 2 (min 5 (+ 2 wave)))
                  (random-int 2 9))
        [op operand] (cond
                       (or (nil? operand) (and (= op :subtract) (zero? result))) [:multiply 2]
                       :else [op operand])
        [op operand] (if (or (and (= op :multiply) (> (* result operand) (answer-limit wave)))
                            (and (= op :add) (>= result (answer-limit wave))))
                       [:subtract (random-int 1 9)] [op operand])
        operand (if (= op :add) (min operand (- (answer-limit wave) result)) operand)]
    (assoc problem :base-operation (or (:base-operation problem) (:operation problem))
                   :operation op :stack-operand operand
                   :stack-steps (conj (vec (stack-steps problem)) {:operation op :operand operand})
                   :answer (case op :add (+ result operand) :subtract (- result operand)
                                 :multiply (* result operand) :divide (/ result operand)))))

(defn max-stack-size [wave]
  (if (< wave 4) 1 (min 5 (+ 2 (quot (- wave 4) 4)))))

(defn make-enemy-problem
  ([wave] (make-enemy-problem wave 5))
  ([wave screen-limit]
   (let [problem (make-problem wave) depth (min screen-limit (max-stack-size wave))]
     (if (and (> depth 1) (< (q/random 1) (min 0.4 (+ 0.2 (* (- wave 4) 0.015)))))
       (reduce (fn [p _] (stack-problem p wave)) problem
               (range (dec (random-int 2 depth)))) problem))))

(def weapons
  {:add {:name "PULSE BURST" :duration 0.55 :id 0}
   :subtract {:name "RAIL SHOT" :duration 0.22 :id 1}
   :multiply {:name "SPREAD BOLTS" :duration 0.65 :id 2}
   :divide {:name "TWIN HELIX" :duration 0.75 :id 3}})

(defn new-game [state]
  (merge state {:mode :playing :wave 1 :score 0 :combo 0 :shields 3
                :shield-charge 0 :shield-bloom 0 :shield-reason "" :special-pulse 0 :special-duration 0 :special-targets [] :special-name "" :wave-perfect? true :wave-shield-earned? false :wave-reward-checked? false
                :enemies [] :effects [] :memory-queue [] :memory-introduced? false :spawned 0 :spawn-timer 0
                :next-id 0 :input "" :message "" :message-timer 0
                :ship-angle 0 :aim-target nil :aim-until 0
                :wave-timer 0 :clock 0 :flash 0 :last-time nil}))

(defn recovery-choice? [state] (> (:wave state) 3))

(defn recovery-wave [state] (max 1 (- (:wave state) 2)))

(defn power-on [state]
  (assoc (new-game state) :wave (recovery-wave state)))

(defn setup []
  (init-controls!)
  (.setAttribute (.getElementById js/document "venture-controls") "data-mode" "ready")
  (set! (.-hidden (.getElementById js/document "venture-recovery")) true)
  (set! (.-hidden (.getElementById js/document "venture-specials")) true)
  (q/resize-sketch (.-innerWidth js/window) (viewport/canvas-height))
  (when-let [host (.getElementById js/document "sketch")]
    (set! (.-tabIndex host) 0)
    (.setAttribute host "aria-label" "Arithmetic defense: type answers and press Enter to fire")
    (.focus host))
  (reset! actions [])
  (q/frame-rate 60)
  (q/text-font "monospace")
  (audio/init (.getElementById js/document "sketch") (.querySelector js/document "#venture-controls .game-toolbar"))
  (controls/settings (.querySelector js/document "#venture-audio .audio-settings"))
  (let [width (q/width) height (.-innerHeight js/window)
        overlay (.querySelector js/document "#sketch canvas:not([data-venture-gpu])")]
    (assoc (new-game (merge (viewport-insets) {:width width :height height
                     :gpu (when overlay (gpu/create (.getElementById js/document "sketch") overlay))
                     :lanes (max 2 (min 7 (int (/ width 160))))
                     :stars (mapv (fn [_] {:x (q/random 1) :y (q/random 1) :depth (q/random 0.2 1)})
                                  (range 180))})) :mode :ready)))

(defn wave-size [wave] (min 22 (+ 4 (* 2 wave))))

(defn spawn-enemy [state]
  (let [echo (first (filter #(<= (:return-at %) (:clock state)) (:memory-queue state)))
        travel (max 20 (- (enemy-y state {:progress 1}) (enemy-y state {:progress 0})))
        screen-limit (max 1 (min 5 (inc (int (/ (* travel 0.45) stack-spacing)))))
        memory? (and (not echo) (>= (:wave state) 5) (not (:memory-introduced? state))
                     (< (q/random 1) 0.18))
        problem (cond
                  echo (-> echo (dissoc :return-at) (assoc :memory-stage :echo :equation "?"))
                  memory? (assoc (make-problem (:wave state)) :memory-stage :preview
                                 :memory-marker (str "M" (:wave state)))
                  :else (make-enemy-problem (:wave state) screen-limit))
        progress (cond
                   (:memory-stage problem) (/ 54 travel)
                   (seq (stack-steps problem)) (/ (* stack-spacing (count (stack-steps problem))) travel)
                   :else 0)
        start-y (enemy-y state {:progress progress})
        available (filterv (fn [lane]
                             (not-any? #(and (= lane (:lane %))
                                             (< (- (enemy-y state %) start-y)
                                                (+ (if (:memory-stage %) 110 92) (* stack-spacing (count (stack-steps %))))))
                                       (:enemies state)))
                           (range (:lanes state)))]
    (if (empty? available)
      state
      (let [lane (nth available (random-int 0 (dec (count available))))
            enemy (merge problem {:id (:next-id state) :lane lane :progress progress
                                  :speed (/ (if memory? 1.25 1) (max 7 (- 18 (* (:wave state) 0.7))))})]
        (cond-> (-> state (update :enemies conj enemy) (update :next-id inc)
                    (assoc :spawn-timer (max 0.7 (- 2.4 (* (:wave state) 0.12)))))
          echo (update :memory-queue #(filterv (fn [queued] (not= (:memory-marker queued) (:memory-marker echo))) %))
          (not echo) (update :spawned inc)
          memory? (assoc :memory-introduced? true :message "MEMORY SHIP: REMEMBER, DON'T FIRE" :message-timer 2))))))

(defn available-enemies [state]
  (remove #(or (:pending-hit? %) (= :preview (:memory-stage %))) (:enemies state)))

(defn target-enemy [state exact?]
  (when (seq (:input state))
    (first (sort-by :progress >
                    (filter #(if exact?
                               (= (:input state) (str (:answer %)))
                               (str/starts-with? (str (:answer %)) (:input state)))
                            (available-enemies state))))))

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

(defn award-shield [state reason]
  (if (>= (:shields state) 5) state
    (do (audio/play "restore" "")
        (assoc state :shields (inc (:shields state))
                     :message (str "+1 SHIELD / " reason) :message-timer 1.8
                     :shield-bloom 2.2 :shield-reason reason))))

(defn charge-shield [state]
  (let [charge (inc (:shield-charge state 0))]
    (if (< charge 8) (assoc state :shield-charge charge)
      (let [rewarded (award-shield (assoc state :shield-charge 0) "8 CORRECT")]
        (if (> (:shields rewarded) (:shields state))
          (assoc rewarded :wave-shield-earned? true) rewarded)))))

(defn hit-effects [enemy effect]
  (into [effect]
        (map-indexed (fn [i step]
                       (assoc effect :target-id nil :points 0 :correct? false :silent? true
                                     :operation (:operation step) :y-offset (* (- stack-spacing) (inc i))))
                     (stack-steps enemy))))

(defn fire-answer [state]
  (if-let [enemy (target-enemy state true)]
    (let [combo (inc (:combo state))
          score (+ (:score state) 100 (* 10 (min combo 20)))]
      (audio/play "player" (name (or (:operation enemy) :add)))
      (-> state
          (assoc :input "" :combo combo :message "SHOT FIRED" :message-timer 0.65
                 :ship-angle (aim-angle state enemy) :aim-target (select-keys enemy [:lane :progress])
                 :aim-until (+ (:clock state) 0.45))
          (update :enemies #(mapv (fn [e] (if (= (:id e) (:id enemy))
                                         (assoc e :pending-hit? true) e)) %))
          (update :effects into (hit-effects enemy {:lane (:lane enemy) :progress (:progress enemy) :age 0
                                :operation (or (:operation enemy) :add) :duration 0.18 :kind :hit
                                :target-id (:id enemy) :points (- score (:score state))
                                :correct? true :accuracy-epoch (:accuracy-epoch state 0)}))))
    (if (empty? (:input state)) state
      (if-let [preview (first (filter #(and (= :preview (:memory-stage %))
                                            (= (:input state) (str (:answer %)))) (:enemies state)))]
        (assoc state :input "" :message (str "REMEMBER " (:memory-marker preview) " — WAIT FOR ITS ECHO")
                     :message-timer 1.5)
      (let [attacker (or (target-enemy state false) (first (sort-by :progress > (available-enemies state))))
            operation (or (:operation attacker) :add)
            weapon (get weapons operation)
            state (cond-> (assoc state :input ""
                               :message (if attacker (str "WRONG — " (:name weapon) " INCOMING") "NO TARGETS — TRY AGAIN")
                               :message-timer 1.2)
                    attacker (assoc :combo 0 :shield-charge 0 :wave-perfect? false
                                    :accuracy-epoch (inc (:accuracy-epoch state 0))))]
        (if attacker
          (do (audio/play "enemy" (name operation))
            (update state :effects conj {:lane (:lane attacker) :progress (:progress attacker)
                                      :operation operation :duration (:duration weapon)
                                      :age 0 :kind :incoming}))
          state))))))

(def special-weapons
  {"arc" {:cost 1 :targets 2 :name "TWIN ARC"}
   "nova" {:cost 2 :targets 3 :name "NOVA STRIKE"}})

(defn special-ready? [state key]
  (let [{:keys [cost targets]} (get special-weapons key)]
    (and cost (= :playing (:mode state)) (not (:menu-visible? state)) (not (:audio-open? state))
         (> (:shields state) cost)
         (>= (count (available-enemies state)) targets))))

(defn fire-special [state key]
  (if-not (special-ready? state key) state
    (let [{:keys [cost targets name]} (get special-weapons key)
          victims (vec (take targets (shuffle (available-enemies state))))
          ids (set (map :id victims))
          target (first victims)]
      (audio/play key "")
      (-> state
          (assoc :shields (- (:shields state) cost) :input ""
                 :wave-perfect? false :special-name name :special-pulse (if (= key "arc") 0.85 1.8)
                 :special-duration (if (= key "arc") 0.85 1.8)
                 :special-targets (mapv #(select-keys % [:lane :progress]) victims)
                 :message (str name " / -" cost " SHIELD" (if (> cost 1) "S" "")) :message-timer 1.5
                 :ship-angle (aim-angle state target) :aim-target (select-keys target [:lane :progress])
                 :aim-until (+ (:clock state) 0.5))
          (update :enemies #(mapv (fn [enemy] (if (contains? ids (:id enemy))
                                               (assoc enemy :pending-hit? true) enemy)) %))
          (update :effects into (mapcat (fn [enemy]
                                       (hit-effects enemy {:lane (:lane enemy) :progress (:progress enemy)
                                        :operation (or (:operation enemy) :add)
                                        :kind :hit :age 0 :target-id (:id enemy) :points 50
                                        :duration (if (= key "arc") 0.24 0.38)})) victims))))))

(defn handle-action [state key]
  (cond
    (and (= :over (:mode state)) (contains? #{"continue" "Enter"} key)) (power-on state)
    (and (= :over (:mode state)) (contains? #{"restart" "r" "R"} key)) (new-game state)
    (= key "p") (case (:mode state) :playing (assoc state :mode :paused)
                      :paused (assoc state :mode :playing :last-time nil)
                      :ready (new-game state) :over (new-game state) state)
    (= key "P") (handle-action state "p")
    (and (= key "Enter") (contains? #{:ready :over} (:mode state))) (new-game state)
    (not= :playing (:mode state)) state
    (contains? #{"arc" "q" "Q"} key) (fire-special state "arc")
    (contains? #{"nova" "w" "W"} key) (fire-special state "nova")
    (= key "Enter") (fire-answer state)
    (= key "Backspace") (update state :input #(subs % 0 (max 0 (dec (count %)))))
    (and (re-matches #"[0-9]" key) (< (count (:input state)) 4))
    (update state :input #(if (= % "0") key (str % key)))
    :else state))

(defn advance-effects [effects dt]
  (doseq [effect effects
          :when (and (= :hit (:kind effect)) (not (:silent? effect)) (< (:age effect) (:duration effect))
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

(defn resolve-hits [state dt]
  ;; Keep a struck ship at its captured coordinates until the projectile arrives.
  (reduce (fn [state effect]
            (if (and (= :hit (:kind effect)) (:target-id effect)
                     (< (:age effect) (:duration effect))
                     (>= (+ (:age effect) dt) (:duration effect))
                     (some #(= (:id %) (:target-id effect)) (:enemies state)))
              (let [score (+ (:score state) (:points effect 0))
                    hit (-> state (assoc :score score)
                            (update :enemies #(filterv (fn [enemy] (not= (:id enemy) (:target-id effect))) %)))]
                (swap! best-score max score)
                (if (and (:correct? effect)
                         (= (:accuracy-epoch effect) (:accuracy-epoch state 0)))
                  (charge-shield (assoc hit :message "DIRECT HIT" :message-timer 0.65)) hit))
              state)) state (:effects state)))

(defn escaped-enemy? [state enemy]
  ;; A formation is missed only after its highest hull has fully left the canvas.
  (> (- (enemy-y state enemy) (* stack-spacing (count (stack-steps enemy))) (if (:memory-stage enemy) 46 34))
     (:height state)))

(defn advance-game [state dt]
  (let [state (resolve-hits state dt)
        enemies (mapv #(if (:pending-hit? %) % (update % :progress + (* dt (:speed %)))) (:enemies state))
        departed (filter #(escaped-enemy? state %) enemies)
        previews (filter #(= :preview (:memory-stage %)) departed)
        escaped (count (remove #(= :preview (:memory-stage %)) departed))
        {:keys [effects impacts]} (advance-effects (:effects state) dt)
        shields (max 0 (- (:shields state) escaped impacts))
        advanced (-> state
                     (assoc :enemies (filterv #(not (escaped-enemy? state %)) enemies) :shields shields :effects effects)
                     (update :memory-queue into (map #(assoc (select-keys % [:answer :operation :memory-marker])
                                                            :return-at (+ (:clock state) dt 3)) previews))
                     (update :spawn-timer - dt)
                     (update :clock + dt)
                     (update :flash #(max 0 (- % dt)))
                     (update :shield-bloom #(max 0 (- (or % 0) dt)))
                     (update :special-pulse #(max 0 (- (or % 0) dt)))
                     (update :message-timer #(max 0 (- % dt))))
        advanced (if (pos? (+ escaped impacts))
                   (do (audio/play "shield" "") (assoc advanced :combo 0 :flash 0.35 :wave-perfect? false)) advanced)]
    (cond
      (zero? shields) (assoc advanced :mode :over :input "")
      (and (>= (:spawned advanced) (wave-size (:wave advanced))) (empty? (:enemies advanced)) (empty? (:memory-queue advanced)))
      (let [settled (if (:wave-reward-checked? advanced) advanced
                      (cond-> (assoc advanced :wave-reward-checked? true)
                        (and (:wave-perfect? advanced) (not (:wave-shield-earned? advanced)))
                        (award-shield "PERFECT WAVE")))
            waiting (update settled :wave-timer + dt)]
        (if (> (:wave-timer waiting) 2)
          (-> waiting (update :wave inc) (assoc :spawned 0 :spawn-timer 0 :wave-timer 0 :input ""
                                               :wave-perfect? true :wave-shield-earned? false :wave-reward-checked? false :memory-introduced? false))
          waiting))
      (and (or (< (:spawned advanced) (wave-size (:wave advanced)))
               (some #(<= (:return-at %) (:clock advanced)) (:memory-queue advanced)))
           (<= (:spawn-timer advanced) 0))
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
        (update :special-targets #(mapv remap (or % [])))
        (update :enemies #(mapv remap %))
        (update :effects #(mapv remap %)))))

(defn update-state [state]
  ;; Quil does not forward p5's windowResized callback; resize in the draw loop.
  (when (or (not= (q/width) (.-innerWidth js/window))
            (not= (q/height) (viewport/canvas-height)))
    (q/resize-sketch (.-innerWidth js/window) (viewport/canvas-height)))
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
      (when-let [controls (.getElementById js/document "venture-controls")]
        (.setAttribute controls "data-mode" (name (:mode state))))
      (when-let [choices (.getElementById js/document "venture-recovery")]
        (set! (.-hidden choices) (or (not= :over (:mode state)) (not (recovery-choice? state)) (:menu-visible? state) audio-open?)))
      (when-let [specials (.getElementById js/document "venture-specials")]
        (set! (.-hidden specials) (or (not= :playing (:mode state)) (:menu-visible? state) audio-open?))
        (set! (.. specials -style -left) (str (ship-x state) "px"))
        (let [{:keys [width left right layout]} (command-layout state)
              available (- (:width state) left right (* width (if (= layout "split") 2 1)))]
          (set! (.. specials -style -width) (str (min 162 (max 100 (- available 8))) "px"))))
      (doseq [key ["arc" "nova"]]
        (when-let [button (.getElementById js/document (str "venture-" key))]
          (set! (.-disabled button) (not (special-ready? state key)))))
      (when-let [power (.getElementById js/document "venture-power-on")]
        (set! (.-textContent power) (str "Power on · Wave " (recovery-wave state))))
      (when-let [button (.getElementById js/document "venture-pause")]
        (set! (.-textContent button) (case (:mode state) :paused "Resume" :ready "Start" :over "Restart" "Pause")))
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
  {:memory {:color [130 203 255] :symbol "◇"}
   :memory-shadow {:color [177 150 255] :symbol "?"}
   :add {:color [245 177 76] :symbol "+"}
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
      (:memory :memory-shadow)
      (do
        (plate! [[0 -28] [24 0] [0 28] [-24 0]])
        (plate! [[0 -17] [14 0] [0 17] [-14 0]])
        (q/no-fill) (apply q/stroke (conj color 130))
        (q/ellipse 0 0 58 58)
        (doseq [[x y] [[0 -24] [20 0] [0 24] [-20 0]]] (glow! x y 4)))
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

(defn draw-single-enemy [state enemy targeted?]
  (let [x (lane-x state (:lane enemy)) y (enemy-y state enemy)
        operation (case (:memory-stage enemy) :preview :memory :echo :memory-shadow (:operation enemy))
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
    (let [label (or (:equation enemy) "") width (+ 20 (q/text-width label))]
      (q/no-stroke)
      (q/fill 3 12 18 230)
      (when (seq label) (q/rect (- x (/ width 2)) (+ y 28) width 27 4))
      (apply q/fill (if targeted? [133 255 227] color))
      (q/text-align :center :center)
      (when (seq label) (q/text label x (+ y 41))))
    (when (:memory-stage enemy)
      (q/text-size 9) (q/fill 166 216 255)
      (q/text (str (if (= :preview (:memory-stage enemy)) "REMEMBER " "RECALL ")
                   (:memory-marker enemy)) x (- y 41))
      (when (= :echo (:memory-stage enemy))
        (q/no-fill) (q/stroke 140 185 255 80) (q/stroke-weight 1)
        (q/ellipse x y 76 76)))))

(defn draw-enemy [state enemy targeted?]
  (let [steps (stack-steps enemy)
        x (lane-x state (:lane enemy)) y (enemy-y state enemy)]
    (draw-single-enemy state (cond-> enemy (seq steps) (assoc :operation (:base-operation enemy))) targeted?)
    (doseq [[i step] (map-indexed vector steps)]
      (let [{:keys [color symbol]} (get enemy-styles (:operation step))]
        (q/push-matrix) (q/translate 0 (* (- stack-spacing) i))
        ;; Arrows connect each adjacent pair, from bottom to top.
        (q/stroke 133 255 227 150) (q/stroke-weight 1)
        (q/line x (- y 23) x (- y (- stack-spacing 23)))
        (q/line x (- y (- stack-spacing 23)) (- x 3) (- y (- stack-spacing 27)))
        (q/line x (- y (- stack-spacing 23)) (+ x 3) (- y (- stack-spacing 27)))
        (q/translate 0 (- stack-spacing))
        (draw-single-enemy state (assoc enemy :operation (:operation step) :equation "") targeted?)
        (q/no-stroke) (q/fill 3 12 18 230) (q/text-size 16)
        (let [label (str symbol " " (:operand step)) width (+ 12 (q/text-width label))
              right? (< x (- (:width state) (+ 40 width)))
              lx (+ x (if right? (+ 36 (/ width 2)) (- (+ 36 (/ width 2)))))]
          (q/rect (- lx (/ width 2)) (- y 13) width 26 4)
          (apply q/fill (if targeted? [133 255 227] color))
          (q/text-align :center :center) (q/text label lx y))
        (q/pop-matrix)))))

(defn effect-points [state {:keys [lane progress kind y-offset]}]
  (let [enemy [(lane-x state lane) (+ (enemy-y state {:progress progress :lane lane}) (or y-offset 0))]
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

(defn draw-shield-gain [state]
  (when (and (pos? (:shield-bloom state 0)) (= :playing (:mode state))
             (not (:menu-visible? state)) (not (:audio-open? state)))
    (let [age (- 2.2 (:shield-bloom state))
          fade (min 1 (/ (:shield-bloom state) 0.65))
          gather (min 1 (/ age 0.65))
          burst (max 0 (- age 0.5))
          x (ship-x state) y (ship-y state)
          pulse (+ 0.7 (* 0.3 (Math/sin (* age 11))))]
      ;; A constellation collapses inward, assembling the protective shell.
      (q/no-stroke)
      (q/fill 110 255 222 (* 25 fade pulse)) (q/ellipse x y 122 122)
      (doseq [i (range 24)]
        (let [angle (+ (* i 2.39996) (* age 0.65))
              radius (+ 40 (* 130 (Math/pow (- 1 gather) 2)))
              px (+ x (* radius (Math/cos angle)))
              py (+ y (* radius (Math/sin angle)))]
          (q/stroke 140 255 229 (* 180 fade)) (q/stroke-weight 1)
          (q/line px py (+ px (* 8 (- 1 gather) (Math/cos angle)))
                           (+ py (* 8 (- 1 gather) (Math/sin angle))))
          (q/no-stroke) (q/fill 221 255 242 (* 240 fade))
          (q/ellipse px py 3 3)))
      ;; Six luminous plates lock into a hexagonal shield.
      (q/no-fill)
      (doseq [i (range 6)]
        (let [a (+ (- (/ Math/PI 2)) (* i (/ Math/PI 3)))
              b (+ a (/ Math/PI 3))
              r (+ 39 (* 18 (- 1 gather)))
              ax (+ x (* r (Math/cos a))) ay (+ y (* r (Math/sin a)))
              bx (+ x (* r (Math/cos b))) by (+ y (* r (Math/sin b)))]
          (q/stroke 110 255 222 (* 45 fade)) (q/stroke-weight 8)
          (q/line ax ay bx by)
          (q/stroke 189 255 233 (* 230 fade pulse)) (q/stroke-weight 2)
          (q/line ax ay (+ ax (* gather (- bx ax))) (+ ay (* gather (- by ay))))))
      (when (pos? burst)
        (doseq [i (range 2)]
          (let [r (+ 42 (* burst (+ 42 (* i 20))))]
            (q/stroke 118 255 226 (* 100 fade (Math/exp (* -2 burst))))
            (q/stroke-weight 1) (q/ellipse x y (* 2 r) (* 2 r)))))
      ;; Keep the gain announcement near the ship, clear of the touch pads.
      (q/no-stroke) (q/text-align :center :center)
      (q/text-size (if (= (:shield-reason state) "PERFECT WAVE") 18 22)) (q/fill 198 255 228 (* 255 fade))
      (q/text (if (= (:shield-reason state) "PERFECT WAVE") "PERFECT WAVE" "+1 SHIELD") x (- y 90 (* 8 gather)))
      (q/text-size 9) (q/fill 118 222 211 (* 230 fade))
      (q/text (if (= (:shield-reason state) "PERFECT WAVE") "+1 SHIELD / BONUS" (:shield-reason state)) x (- y 70 (* 8 gather)))
      (q/no-fill) (q/stroke 118 255 226 (* 75 fade (Math/exp (* -4 age))))
      (q/stroke-weight 3) (q/rect 2 2 (- (:width state) 4) (- (:height state) 4))
      (q/stroke-weight 1))))

(defn draw-special-launch [state]
  (when (and (pos? (:special-pulse state 0)) (= :playing (:mode state))
             (not (:menu-visible? state)) (not (:audio-open? state)))
    (let [duration (:special-duration state 1.1)
          age (- duration (:special-pulse state)) fade (/ (:special-pulse state) duration)
          x (ship-x state) y (ship-y state) nova? (= "NOVA STRIKE" (:special-name state))]
      (if-not nova?
        ;; Twin Arc: two sharp, forked electric discharges.
        (doseq [target (:special-targets state)]
          (let [tx (lane-x state (:lane target)) ty (enemy-y state target)
                dx (- tx x) dy (- ty y) distance (max 1 (Math/hypot dx dy))
                nx (/ (- dy) distance) ny (/ dx distance)
                front (min 1 (/ age 0.24))
                strength (* fade (+ 0.55 (* 0.45 (Math/pow (Math/sin (* age 32)) 2))))]
            (doseq [j (range 10) :when (< (/ j 10) front)]
              (let [a (/ j 10) b (min front (/ (inc j) 10))
                    offset (fn [t] (* 12 (Math/sin (* t Math/PI))
                                      (Math/sin (+ (* t 53) (* age 45)))))
                    ax (+ x (* dx a) (* nx (offset a))) ay (+ y (* dy a) (* ny (offset a)))
                    bx (+ x (* dx b) (* nx (offset b))) by (+ y (* dy b) (* ny (offset b)))]
                (q/stroke 90 170 255 (* 55 strength)) (q/stroke-weight 8) (q/line ax ay bx by)
                (q/stroke 180 240 255 (* 230 strength)) (q/stroke-weight 1.6) (q/line ax ay bx by)
                (when (zero? (mod j 3))
                  (q/stroke 105 205 255 (* 140 strength)) (q/stroke-weight 1)
                  (q/line bx by (+ bx (* nx 18)) (+ by (* ny 18))))))
            (q/no-fill) (q/stroke 150 225 255 (* 180 fade)) (q/stroke-weight 1)
            (when (>= age 0.24)
              (q/ellipse tx ty (+ 18 (* age 42)) (+ 18 (* age 42))))))
        ;; Nova: a charged star, three curling comets and large stellar impacts.
        (do
          (q/no-stroke) (q/fill 225 140 255 (* 45 fade))
          (q/ellipse x y 112 112)
          (q/fill 255 230 255 (* 190 fade (Math/exp (* -5 age))))
          (q/ellipse x y 38 38)
          (q/no-fill)
          (doseq [i (range 3)]
            (let [r (+ 24 (* (max 0 (- age 0.18)) (+ 160 (* i 70))))]
              (q/stroke 225 145 255 (* 100 fade (Math/exp (* -0.7 age)))) (q/stroke-weight (if (zero? i) 3 1))
              (q/ellipse x y (* 2 r) (* 2 r))))
          (doseq [target (:special-targets state)]
            (let [tx (lane-x state (:lane target)) ty (enemy-y state target)
                  dx (- tx x) dy (- ty y) distance (max 1 (Math/hypot dx dy))
                  nx (/ (- dy) distance) ny (/ dx distance)
                  flight (min 1 (/ age 0.38)) blast (max 0 (- age 0.38))]
              (when (< age 0.38)
                (doseq [i (range 10)]
                  (let [t (max 0 (- flight (* i 0.035)))
                        bend (* 38 (Math/sin (* t Math/PI)))
                        px (+ x (* dx t) (* nx bend)) py (+ y (* dy t) (* ny bend))
                        size (max 2 (- 16 (* i 1.3)))]
                    (q/no-stroke) (q/fill 220 130 255 (* 170 (- 1 (/ i 10))))
                    (q/ellipse px py size size)
                    (when (zero? i) (q/fill 255 244 221 245) (q/ellipse px py 7 7)))))
              (when (pos? blast)
                (let [f (* fade (Math/exp (* -0.8 blast)))
                      r (+ 12 (* 135 (- 1 (Math/exp (* -3 blast)))))]
                  (q/no-stroke) (q/fill 210 120 255 (* 35 f)) (q/ellipse tx ty (* r 2.2) (* r 2.2))
                  (q/fill 255 241 215 (* 255 (Math/exp (* -14 blast)))) (q/ellipse tx ty 68 68)
                  (q/no-fill) (q/stroke 245 170 255 (* 210 f)) (q/stroke-weight 2)
                  (q/ellipse tx ty (* 2 r) (* 2 r))
                  (q/stroke 255 215 140 (* 130 f)) (q/stroke-weight 1)
                  (q/ellipse tx ty (* 1.4 r) (* 1.4 r))
                  (doseq [i (range 32)]
                    (let [a (+ (* i 2.39996) (* blast 0.5))
                          travel (* r (+ 0.5 (* 0.08 (mod i 7))))
                          px (+ tx (* travel (Math/cos a))) py (+ ty (* travel (Math/sin a)))]
                      (q/stroke (if (even? i) 255 205) (if (even? i) 210 140) (if (even? i) 140 255) (* 180 f))
                      (q/line px py (+ px (* 12 (Math/cos a))) (+ py (* 12 (Math/sin a))))))))))
          (q/no-fill) (q/stroke 225 145 255 (* 100 fade (Math/exp (* -4 (Math/abs (- age 0.38))))))
          (q/stroke-weight 3) (q/rect 2 2 (- (:width state) 4) (- (:height state) 4))))
      (q/no-stroke) (if nova? (q/fill 240 175 255 (* 255 fade)) (q/fill 150 220 255 (* 255 fade)))
      (q/text-align :center :center) (q/text-size (if nova? 16 11))
      (q/text (:special-name state) x (- y 68))
      (q/stroke-weight 1))))

(defn draw-hud [state]
  (q/text-align :right :top)
  (q/text-size 12)
  (q/no-stroke)
  (q/fill 175 218 220)
  (q/text (str "SCORE " (:score state) "  /  WAVE " (:wave state)) (- (:width state) 18 (:safe-right state 0)) (+ 65 (:safe-top state 0)))
  (q/text-align :left :top)
  (q/text (str "SHIELDS " (apply str (repeat (:shields state) "◆"))) (+ 18 (:safe-left state 0)) (+ 65 (:safe-top state 0)))
  (q/text-size 9) (q/fill 99 149 157)
  (q/text (str "SHIELD CHARGE " (:shield-charge state 0) "/8 · " (gpu/status (:gpu state))) (+ 18 (:safe-left state 0)) (+ 80 (:safe-top state 0)))
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
      (q/text (case view :ready "MATH FLEET" :paused "PAUSED" :over "FLIGHT ENDED" :audio-settings "SETTINGS") cx (- cy 30))
      (q/text-size 12)
      (q/fill 148 186 192)
      (q/text (case view
                :ready "Wrong answers provoke enemy fire."
                :paused "Take a breath. The fleet can wait."
                :over (str "Score " (:score state) "  ·  Best " @best-score)
                :audio-settings "Gameplay paused while you adjust settings.") cx (+ cy 8))
      (when (= :ready (:mode state))
        (q/text-size 10)
        (q/text "Solve to fire. Each enemy hit costs one shield." cx (+ cy 27))
        (q/text "WAVE 4+: STACKS READ BOTTOM TO TOP" cx (+ cy 46))
        (q/text "SHIELD: 8 CORRECT / PERFECT WAVE · MAX 5" cx (+ cy 65)))
      (q/text-size 11)
      (q/fill 134 250 218)
      (q/text (case view
                :ready "CLICK OR PRESS ENTER TO LAUNCH"
                :paused "PRESS P OR RESUME TO CONTINUE"
                :over (if (recovery-choice? state) "" "CLICK OR PRESS ENTER TO RESTART")
                :audio-settings "CLOSE SETTINGS TO CONTINUE") cx (+ cy (if (= view :ready) 85 46)))))))

(defn draw-state [state]
  (q/rect-mode :corner)
  (q/ellipse-mode :center)
  (draw-background state)
  (draw-ship state)
  (let [target (:id (target-enemy state false))]
    (doseq [enemy (:enemies state)] (draw-enemy state enemy (= target (:id enemy)))))
  (draw-effects state)
  (draw-shield-gain state)
  (draw-special-launch state)
  (draw-hud state)
  (when (pos? (:flash state))
    (q/no-stroke)
    (q/fill 255 74 48 (* 80 (/ (:flash state) 0.35)))
    (q/rect 0 0 (:width state) (:height state)))
  (draw-overlay state))

(defn mouse-clicked [state]
  (if (and (not (:menu-visible? state)) (not (audio/settingsOpen)) (or (= :ready (:mode state))
                                (and (= :over (:mode state)) (not (recovery-choice? state)))))
    (do (audio/unlock) (new-game state)) state))

(registry/def-sketch "Add Venture" '(99 230 209)
  {:host "sketch" :setup setup :update update-state :draw draw-state
   :mouse-clicked mouse-clicked :size [menu/w menu/h]
   :middleware [menu/show-frame-rate m/fun-mode]
   :settings (fn [] (q/pixel-density 1))})
