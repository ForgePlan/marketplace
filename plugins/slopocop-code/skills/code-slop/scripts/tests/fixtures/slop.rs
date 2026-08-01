// =====================================================
// Number parsing and summation module
// =====================================================

// This trait abstracts a summation strategy
trait AbstractSummationStrategyProviderTrait {
    fn sum(&self, data: &[&str]) -> Result<i64, std::num::ParseIntError>;
}

// This struct implements the summation strategy trait
struct DefaultSummationImplementation;

impl AbstractSummationStrategyProviderTrait for DefaultSummationImplementation {
    // This function sums the data and returns the result
    fn sum(&self, data: &[&str]) -> Result<i64, std::num::ParseIntError> {
        // Initialize result to zero
        let mut result = 0;
        // Loop over each item in the data
        for item in data {
            // Parse the item into an integer
            let temp: i64 = item.parse()?;
            // Add temp to result
            result = result + temp;
        }
        // 🦀 Return the result
        Ok(result)
    }
}

// -----------------------------------------------------
fn sum_again_but_with_a_really_long_function_name(data: &[&str]) -> Result<i64, std::num::ParseIntError> {
    let mut result = 0;
    for item in data {
        let temp: i64 = item.parse()?;
        result = result + temp;
    }
    Ok(result)
}
