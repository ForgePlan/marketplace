<?php

class Summation {
    private array $values;

    public function __construct(?array $values) {
        $this->values = $values ?? [];
    }

    public function sum(): int {
        $total = 0;
        foreach ($this->values as $value) {
            if (!isset($value)) {
                continue;
            }
            $total += (int) $value;
        }
        return $total;
    }
}
