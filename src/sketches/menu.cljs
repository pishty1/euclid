(ns sketches.menu
  (:require [quil.core :as q]))

(defonce selected-sketch (atom 0))

(defonce body (.-body js/document))
(defonce w (.-clientWidth body))
(defonce h (.-clientHeight body))

(defn prevent-behavior [e]
  (.preventDefault e))

(.addEventListener js/document "touchmove" prevent-behavior #js {:passive false})
;; (.addEventListener js/document "contextmenu" prevent-behavior #js {:passive false})
;; (set! (.-disabled (.getElementById js/document "myapp")) true)

(defn mobile-browser? []
  (let [user-agent (or (.-userAgent js/navigator)
                       (.-vendor js/navigator)
                       (.-opera js/window))]
    (boolean (re-find #"(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini)" user-agent))))

(def showcase [{:name "Flow"
                :start 'flow/start
                :color '(120 0 10)}
               {:name "Cross"
                :start 'tut1/start
                :color '(120 100 10)}
              ;;  {:name "Move"
              ;;   :start 'tut2/start
              ;;   :color '(120 200 10)}
               {:name "Euclid"
                :start 'euclid/start
                :color '(160 100 100)}
              ;;  {:name "Perlin"
              ;;   :start 'tut3/start
              ;;   :color '(120 500 100)}
               {:name "Figget-A-Balls"
                :start 'tut5/start
                :color '(160 80 130)}
               {:name "Venture"
                :start 'tut4/start
                :color '(120 0 100)}])

(defn gen-menu-items [items origin width height]
  (let [padding-top 0]
    (loop [index 0
           mrange items
           items []]
      (if (seq mrange)
        (recur (inc index)
               (rest mrange)
               (conj items
                     {:index index
                      :label (:name (first mrange))
                      :start-fn (:start (first mrange))
                      :color (:color (first mrange))
                      :height height
                      :width width
                      :px (:ox origin); lets start here and stack them down 
                      :py (+ padding-top (+ (:oy origin) (* index height)))}))
        items))))

(defn burger-icon []
  (q/stroke 10)
  (q/fill 220 120 102)
  (q/rect 0 0 80 50))

; get total height of page - totoal height of menu items divide by 2  = starting y 
(defn origin [number-of-menu-items height width page-height page-width]
  (let [diff-y (- page-height (* number-of-menu-items height))
        diff-x (- page-width width)
        origin-y (/ diff-y 2)
        origin-x (/ diff-x 2)]
    {:ox origin-x
     :oy origin-y}))

(defn draw-menu-item [label x y h w color]
  (q/fill (first color) (second color) (last color))
  (q/stroke-weight 8)
  (q/stroke 6)
  (q/rect x y w h)
  (q/fill 200)
  (q/text-size 20)
  (q/text label (+ x 40) (+ y 60)))

(defn draw-menu [items]
  (doseq [{:keys [label px py height width color]} (:items items)]
    (draw-menu-item
     label
     px
     py
     height
     width
     color)))

(defn init-menu [mobile? page-height page-width]
  (let [width (if mobile? (/ page-width 2) 300)
        height 100
        number (count showcase)
        origin (origin number height width page-height page-width)]
    {:number number
     :width width
     :height height
     :origin origin
     :dimentions {:tox (+ (:ox origin) width)
                  :toy (+ (:oy origin) (* height number))
                  :fromx (:ox origin)
                  :fromy (:oy origin)}
     :items (gen-menu-items showcase origin width height)}))


(defn wrap-setup [options]
  (let [setup (:setup options (fn [] nil))
        mobile? (mobile-browser?)
        updated-state (fn []
                        (reset!
                         (q/state-atom)
                         (assoc (setup)
                                :menu (init-menu mobile? h w)
                                :mobile? mobile?
                                :menu-visible? false
                                :w w
                                :h h)))]
    (-> options
        (assoc :setup updated-state))))


(defn wrap-draw [options]
  (let [draw (:draw options (fn [_] nil))
        updated-draw (fn []
                       (let [_ (draw)
                             current-rect-mode (q/state)]
                         (q/rect-mode :corner)
                         (if (q/state :menu-visible?)
                           (draw-menu (q/state :menu))
                           (burger-icon))
                         
                         (q/rect-mode (:rect-mode current-rect-mode :corner))))]
    (-> options
        (dissoc :update)
        (assoc :draw updated-draw))))


(defn show-frame-rate [options]
  (-> options
      wrap-setup
      wrap-draw
      ))


(defn inside? [mousex mousey fromx fromy tox toy]
  (and (<= fromx mousex tox)
       (<= fromy mousey toy)))

(defn inside-burger? []
  (inside? (q/mouse-x) (q/mouse-y) 0 0 80 50))

(defn inside-menu? [{:keys [fromx fromy tox toy]}]
  (inside? (q/mouse-x) (q/mouse-y) fromx fromy tox toy))

(defn when-mouse-pressed [state]
  (when (and (:menu-visible? state) (inside-menu? (:dimentions (:menu state))))
    (let [selected (some #(when (inside?
                                 (q/mouse-x) (q/mouse-y)
                                 (:px %) (:py %)
                                 (+ (:px %) (:width %))
                                 (+ (:py %) (:height %)))
                            %)
                         (:items (:menu state)))]
      (when selected
        (reset! selected-sketch (:index selected)))))

  (assoc state
         :menu-visible? (and (inside-burger?)
                             (not (:menu-visible? state)))
         :mouse-pressed-position [(q/mouse-x) (q/mouse-y)]))