(ns sketches.initial-tests
  (:require [cljs.test :refer [deftest is testing]]
            [sketches.repo.flow :refer [add]]))

(deftest add-test
  (testing "Addition function tests"
    (is (= 3 (add 1 2)) "1 + 2 should equal 3")
    (is (= 5 (add 2 3)) "2 + 3 should equal 5")
    (is (= 0 (add -1 1)) "-1 + 1 should equal 0")))

(comment 
  
  )