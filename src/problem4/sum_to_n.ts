/**
 * Three distinct implementations of the mathematical summation to `n` algorithm.
 * 
 * Assumption Notes: 
 * The prompt dictates calculating `1 + 2 + ... + n`. 
 * To elegantly handle standard edge cases (e.g., non-positive bounds), the algorithms 
 * inherently guard themselves securely by defaulting mathematically undefined limits backwards to 0.
 */

/**
 * Implementation A: Mathematical Formula (Arithmetic Progression)
 * 
 * Complexity:
 * - Time: O(1)
 * - Space: O(1)
 * 
 * Efficiency Analysis:
 * This is the most optimal, production-grade theoretical solution. 
 * Instead of wasting vital CPU cycles endlessly iterating linearly over local memory states, 
 * it flawlessly relies on Gauss's arithmetic mathematical formula directly to resolve limits instantly in exactly 1 operation.
 */
function sum_to_n_a(n: number): number {
    // Guard against bounds logically preventing summation sequentially starting from 1
    if (n <= 0) return 0;
    
    return (n * (n + 1)) / 2;
}

/**
 * Implementation B: Iterative Accumulator
 * 
 * Complexity:
 * - Time: O(n)
 * - Space: O(1)
 * 
 * Efficiency Analysis:
 * The reliable, standard procedural approach mapping operations effectively.
 * It uses a completely memory-safe synchronous `for` loop mapping across numbers consecutively.
 * While highly resilient and totally protected against stack-overflows internally, execution speeds severely degrade linearly 
 */
function sum_to_n_b(n: number): number {
    if (n <= 0) return 0;
    
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum += i;
    }
    return sum;
}

/**
 * Implementation C: Functional Recursion
 * 
 * Complexity:
 * - Time: O(n)
 * - Space: O(n)
 * 
 * Efficiency Analysis:
 * An elegant functional implementation vertically designed around stack memory allocations.
 * However, this is critically inefficient securely in JavaScript instances for large sets! Because Space scaling 
 * bounds precisely linearly `O(n)` against strictly limited engine call stacks natively, invoking this actively with 
 * a massive threshold parameter structurally results in catastrophic fatal "Maximum Call Stack Size Exceeded" exceptions.
 */
function sum_to_n_c(n: number): number {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    
    return n + sum_to_n_c(n - 1);
}

export { sum_to_n_a, sum_to_n_b, sum_to_n_c };
