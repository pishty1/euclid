(ns registry
  (:require [quil.core :as q]))

;; Change to a vector to allow auto-indexing (0, 1, 2...)
(defonce sketches (atom []))

(defn upsert-sketch [current-sketches new-sketch]
  (let [index (first (keep-indexed (fn [idx s] 
                                     (when (= (:name s) (:name new-sketch)) 
                                       idx)) 
                                   current-sketches))]
    (if index
      (assoc current-sketches index new-sketch) ;; Update existing
      (conj current-sketches new-sketch))))     ;; Add new

;; New Helper: Defines and Registers in one go
(defn def-sketch [name color options]
  (let [start-fn (fn [] (apply q/sketch (apply concat options)))
        new-sketch {:name name
                    :start start-fn
                    :color color}]
    (swap! sketches upsert-sketch new-sketch)))

;; Backward compatibility for existing files (ignores the manual index)
(defn register-sketch [_index name start-fn color]
  (let [new-sketch {:name name
                    :start start-fn
                    :color color}]
    (swap! sketches upsert-sketch new-sketch)))

(defn get-sketch [index]
  (get @sketches index))

(defn get-all-sketches []
  ;; Returns [[0 sketch] [1 sketch] ...] compatible with menu
  (map-indexed vector @sketches))
