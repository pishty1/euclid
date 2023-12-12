(ns sketches.channels
  (:require
   [cljs.core.async :refer [chan]]))
   
(defonce my-channel (chan))
