from typing import List

DISCOUNT_RATE = 0.1


def total(prices: List[float]) -> float:
    return sum(prices)


def total_with_discount(prices: List[float]) -> float:
    return total(prices) * (1 - DISCOUNT_RATE)
