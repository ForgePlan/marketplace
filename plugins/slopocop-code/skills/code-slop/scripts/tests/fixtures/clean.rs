/// Parses each element as an integer and returns the total.
fn sum(values: &[&str]) -> Result<i64, std::num::ParseIntError> {
    let mut total = 0;
    for value in values {
        match value.parse::<i64>() {
            Ok(n) => total += n,
            Err(e) => return Err(e),
        }
    }
    Ok(total)
}
