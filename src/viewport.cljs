(ns viewport)

(defn canvas-height []
  ;; The host uses 100lvh so art continues behind translucent browser chrome.
  ;; Interactive controls stay in the visible viewport (window.innerHeight).
  (let [host (.getElementById js/document "sketch")]
    (max (.-innerHeight js/window) (if host (.-clientHeight host) 0))))
