package fixtures

import "strconv"

// Sum parses each element as an integer and returns the total.
func Sum(values []string) (int, error) {
	total := 0
	for _, v := range values {
		n, err := strconv.Atoi(v)
		if err != nil {
			return 0, err
		}
		total += n
	}
	return total, nil
}
