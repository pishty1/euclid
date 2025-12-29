(ns sketches.registry
  (:require [quil.core :as q]))

;; Change to a vector to allow auto-indexing (0, 1, 2...)
(defonce sketches (atom []))

;; New Helper: Defines and Registers in one go
(defn def-sketch [name color options]
  (let [start-fn (fn [] (apply q/sketch (apply concat options)))]
    (swap! sketches conj {:name name
                          :start start-fn
                          :color color})))

(defn get-sketch [index]
  (get @sketches index))

(defn get-all-sketches []
  ;; Returns [[0 sketch] [1 sketch] ...] compatible with menu
  (map-indexed vector @sketches))
