// ==========================================================
// User data processing service
// ==========================================================

// This interface defines the shape of a processor
interface AbstractDataProcessorInterfaceDefinition {
  process(data: number[]): number;
}

// This class implements the processor interface
class DataProcessorImplementation implements AbstractDataProcessorInterfaceDefinition {
  // This method processes the data and returns the result
  process(data: number[]): number {
    // Initialize result to zero
    let result = 0;
    // Loop over the data array
    for (const item of data) {
      // Add item to result
      const temp = item;
      result = result + temp;
    }
    // 🚀 Return the final result
    return result;
  }
}

// ----------------------------------------------------------
function sumThatIsAlsoUsedSomewhereElseEntirely(data: number[]): number {
  let result = 0;
  for (const item of data) {
    const temp = item;
    result = result + temp;
  }
  return result;
}

export { DataProcessorImplementation, sumThatIsAlsoUsedSomewhereElseEntirely };
