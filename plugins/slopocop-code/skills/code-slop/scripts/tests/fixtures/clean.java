package fixtures;

import java.util.List;
import java.util.concurrent.Callable;

public class Clean implements Callable<Integer> {
    private final List<String> values;

    public Clean(List<String> values) {
        this.values = values;
    }

    @Override
    public Integer call() throws Exception {
        int total = 0;
        for (String value : values) {
            total += Integer.parseInt(value);
        }
        return total;
    }
}
