(ns sketches.ecosystem-builder (:require [menu :as menu]))

(def css
  "#ecosystem-builder *{box-sizing:border-box}#ecosystem-builder{display:none;position:fixed;right:18px;top:115px;width:270px;max-height:calc(100dvh - 230px);overflow:auto;box-sizing:border-box;padding:18px;border:1px solid #618b9c55;border-radius:14px;background:#0b1a29f5;color:#c8dee0;z-index:16;font:13px system-ui;box-shadow:0 12px 40px #0005}body[data-sketch='Figget-A-Balls'] #ecosystem-builder:not([hidden]){display:block}#ecosystem-builder h2{font-size:17px;margin:0 0 6px}#ecosystem-builder p{font-size:12px;color:#8cabb8;line-height:1.5;margin:0 0 16px}#ecosystem-builder label{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:12px 0}#ecosystem-builder select,#ecosystem-builder input{box-sizing:border-box;max-width:140px;background:#142b3a;color:#dcf0e8;border:1px solid #618b9c77;border-radius:6px;padding:6px;font:13px system-ui}#ecosystem-builder input[type=number]{width:75px}#ecosystem-builder input[type=color]{width:55px;height:32px;padding:2px}#ecosystem-builder button{background:#153c43;color:#c6f1df;border:1px solid #76cab166;border-radius:8px;padding:9px;cursor:pointer;font:13px system-ui}#ecosystem-builder .builder-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0}#ecosystem-builder .builder-wide{width:100%;margin:6px 0}#ecosystem-builder :focus-visible{outline:2px solid #efc076;outline-offset:2px}#ecosystem-builder small{display:block;color:#8cabb8;line-height:1.5}#ecosystem-builder input[type=checkbox]{accent-color:#56db89}#builder-status{min-height:18px;margin-top:10px;color:#efc076}@media(max-width:600px){#ecosystem-builder{right:12px;top:112px;width:min(300px,calc(100vw - 24px));max-height:calc(100dvh - 270px)}#figget-controls{max-width:calc(100vw - 28px);flex-wrap:wrap;justify-content:flex-end}}")

(defn settings []
  (let [value (fn [id] (.-value (.getElementById js/document id)))]
    {:kind (js/parseInt (value "builder-kind"))
     :scale (js/parseFloat (value "builder-size"))
     :drive (js/parseFloat (value "builder-motion"))
     :count (let [n (js/parseInt (value "builder-count"))]
              (max 1 (min 80 (if (js/Number.isFinite n) n 1))))}))

(defn init! [enqueue]
  (when-not (.getElementById js/document "ecosystem-builder")
    (.appendChild (.-head js/document) (menu/element "style" "" css))
    (let [panel (menu/element "section" "" nil)
          field! (fn [label id tag]
                   (let [row (menu/element "label" "" label) input (menu/element tag "" nil)]
                     (set! (.-id input) id) (.appendChild row input) (.appendChild panel row) input))
          select! (fn [label id choices]
                    (let [input (field! label id "select")]
                      (doseq [[value text] choices]
                        (let [option (menu/element "option" "" text)]
                          (set! (.-value option) (str value)) (.appendChild input option))) input))
          button! (fn [parent text f]
                    (let [b (menu/element "button" "" text)]
                      (set! (.-type b) "button") (.addEventListener b "click" f) (.appendChild parent b) b))]
      (set! (.-id panel) "ecosystem-builder") (set! (.-hidden panel) true)
      (.setAttribute panel "aria-label" "Ecosystem builder")
      (.appendChild panel (menu/element "h2" "" "Ecosystem builder"))
      (.appendChild panel (menu/element "p" "" "Mix organisms, scatter a population, or place them yourself."))
      (let [kind (select! "Organism" "builder-kind" [[0 "Chain"] [1 "Ring"] [2 "Colony"]])]
        (.addEventListener kind "change"
                          (fn [_] (enqueue {:type :choose-kind :kind (js/parseInt (.-value kind))}))))
      (let [size (select! "Body size" "builder-size" [[0.7 "Small"] [1 "Medium"] [1.4 "Large"]])]
        (set! (.-value size) "1"))
      (let [motion (select! "Movement" "builder-motion" [[0.2 "Drift"] [1 "Swim"] [1.8 "Lively"]])]
        (set! (.-value motion) "1"))
      (let [count (field! "Population to add" "builder-count" "input")]
        (set! (.-type count) "number") (set! (.-min count) "1") (set! (.-max count) "80") (set! (.-value count) "10"))
      (let [color (field! "Type colour" "builder-color" "input")]
        (set! (.-type color) "color") (set! (.-value color) "#56db89")
        (.addEventListener color "input" (fn [_] (enqueue {:type :color :kind (:kind (settings)) :color (.-value color)}))))
      (.appendChild panel (menu/element "small" "" "Colour changes apply to all organisms of this type."))
      (let [row (menu/element "div" "builder-actions" nil)]
        (button! row "Scatter population" (fn [_] (enqueue (assoc (settings) :type :scatter))))
        (button! row "Place one" (fn [_] (enqueue (assoc (settings) :type :place))))
        (.appendChild panel row))
      (let [auto (field! "Automatic density" "builder-auto" "input")]
        (set! (.-type auto) "checkbox")
        (.addEventListener auto "change" (fn [_] (enqueue {:type :auto :enabled? (.-checked auto)}))))
      (.appendChild panel (menu/element "small" "" "Off keeps your population intact. On lets FPS tuning add or remove organisms."))
      (let [empty (button! panel "Start empty" (fn [_] (enqueue :empty)))]
        (set! (.-className empty) "builder-wide"))
      (let [close (button! panel "Close builder" (fn [_] (enqueue :builder)))]
        (set! (.-className close) "builder-wide"))
      (.appendChild panel (menu/element "div" "" nil))
      (set! (.-id (.-lastChild panel)) "builder-status")
      (.setAttribute (.-lastChild panel) "role" "status")
      (doseq [event ["mousedown" "mouseup" "touchstart" "touchend" "touchmove"]]
        (.addEventListener panel event (fn [e] (.stopPropagation e))))
      (.appendChild (.-body js/document) panel))))

(defn sync! [state]
  (when-let [panel (.getElementById js/document "ecosystem-builder")]
    (set! (.-hidden panel) (not (:builder-open? state)))
    (set! (.-checked (.getElementById js/document "builder-auto")) (:auto? state))
    (set! (.-textContent (.getElementById js/document "builder-status")) (:builder-status state ""))))
