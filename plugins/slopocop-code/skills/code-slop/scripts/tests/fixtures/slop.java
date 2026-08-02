package fixtures;

import java.util.List;
import java.util.concurrent.Callable;

// ==========================================================
//  Number Summation Component
// ==========================================================

// AbstractNumberSummationStrategyProvider defines the summation contract
interface AbstractNumberSummationStrategyProvider {
    int sum(List<String> data) throws Exception;
}

// DefaultProvider implements the summation contract
public class Slop implements Callable<Integer>, AbstractNumberSummationStrategyProvider {
    // the data field holds the data
    private final List<String> data;

    // constructor that sets the data
    public Slop(List<String> data) {
        this.data = data;
    }

    // 🎯 call runs the summation and returns the result
    @Override
    public Integer call() throws Exception {
        return sum(data);
    }

    // sum sums the data and returns the final result
    @Override
    public int sum(List<String> data) throws Exception {
        // initialize the result to zero
        int result = 0;
        // loop over every item in the data
        for (String item : data) {
            // parse the item into a temp integer
            int temp = Integer.parseInt(item);
            // add temp to the result
            result = result + temp;
        }
        // return the result
        return result;
    }

    // processTheDataAndReturnTheFinalResult sums the data again
    public int processTheDataAndReturnTheFinalResult(List<String> data) throws Exception {
        int result = 0;
        for (String item : data) {
            int temp = Integer.parseInt(item);
            result = result + temp;
        }
        return result;
    }
}
