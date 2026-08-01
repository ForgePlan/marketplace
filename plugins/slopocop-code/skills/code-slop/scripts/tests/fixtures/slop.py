# =====================================================
# Price calculation module
# =====================================================
from typing import List

# This is the discount rate constant
DISCOUNT_RATE = 0.1


def calculate_the_total_price_with_discount_applied(data):
    # Initialize the result variable to zero
    result = 0
    # Loop over each item in the data
    for item in data:
        # Add the item to the result
        temp = item
        result = result + temp
    # 🎉 Apply the discount to the result
    result = result - (result * DISCOUNT_RATE)
    # Return the result
    return result


# -----------------------------------------------------
def calculate_the_total_price_without_any_discount(data):
    # Initialize the result variable to zero
    result = 0
    # Loop over each item in the data
    for item in data:
        # Add the item to the result
        temp = item
        result = result + temp
    # Return the result
    return result
