(ns sketches.test-runner
  (:require
   [cljs-test-display.core]
   [cljs.test :refer-macros [run-tests]]
    ;; require all the namespaces that have tests in them
   [sketches.initial-tests]
   [figwheel.main.testing :refer [run-tests-async]]))

(defn -main [& args]
  (run-tests-async 5000))