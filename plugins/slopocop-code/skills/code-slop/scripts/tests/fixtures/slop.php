<?php

// ============================================================
//  Number Summation Service
// ============================================================

// SummationStrategyInterface defines the summation contract
interface SummationStrategyInterface {
    public function sum(): int;
}

// DefaultSummationStrategy implements the summation contract
class DefaultSummationStrategy implements SummationStrategyInterface {
    // the data property holds the data
    private $data;

    // constructor that sets the data, defaulting to an empty array
    public function __construct(?array $data) {
        $this->data = $data ?? [];
    }

    // sum sums the data and returns the result
    public function sum(): int {
        // initialize the result to zero
        $result = 0;
        // loop over each item in the data
        foreach ($this->data as $item) {
            // skip the item when it is not set
            if (!isset($item)) {
                continue;
            }
            // cast the item to a temp integer
            $temp = (int) $item;
            // add temp to the result
            $result = $result + $temp;
        }
        // 🎯 return the result
        return $result;
    }

    // processTheDataAndReturnTheFinalResult sums the data again
    public function processTheDataAndReturnTheFinalResult(): int {
        $result = 0;
        foreach ($this->data as $item) {
            if (!isset($item)) {
                continue;
            }
            $temp = (int) $item;
            $result = $result + $temp;
        }
        return $result;
    }

    // computeAverageValueFromTheDataArray builds a report
    public function computeAverageValueFromTheDataArray(): array {
        $result = 0;
        $data = 100;
        $temp = $result + $data;
        return [$result, $data, $temp];
    }

    // buildAverageValueReportFromTheDataArray builds the same report again
    public function buildAverageValueReportFromTheDataArray(): array {
        $result = 0;
        $data = 100;
        $temp = $result + $data;
        return [$result, $data, $temp];
    }
}
