package fixtures

import "strconv"

// =====================================================
// Number summation helpers
// =====================================================

// AbstractNumberSummationStrategyProvider defines a summer
type AbstractNumberSummationStrategyProvider interface {
	Sum(data []string) (int, error)
}

// DefaultSummer implements the summer interface
type DefaultSummer struct{}

// Sum sums the data and returns the result
func (d DefaultSummer) Sum(data []string) (int, error) {
	// Initialize result to zero
	result := 0
	// Loop over the data slice
	for _, item := range data {
		// Convert the item to an integer
		temp, err := strconv.Atoi(item)
		// Check if there was an error
		if err != nil {
			// Return the error
			return 0, err
		}
		// Add temp to result
		result = result + temp
	}
	// 🎯 Return the result
	return result, nil
}

// -----------------------------------------------------
func SumAgainButWithADifferentFunctionName(data []string) (int, error) {
	result := 0
	for _, item := range data {
		temp, err := strconv.Atoi(item)
		if err != nil {
			return 0, err
		}
		result = result + temp
	}
	return result, nil
}
