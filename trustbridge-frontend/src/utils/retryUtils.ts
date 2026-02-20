/**
 * Retry utility for reliable contract calls
 * Handles transient RPC errors and network issues
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'CALL_EXCEPTION',
    'NETWORK_ERROR',
    'TIMEOUT',
    'ECONNRESET',
    'ETIMEDOUT',
    'Internal JSON-RPC error',
    'missing revert data',
    '-32603', // Internal JSON-RPC error code
  ],
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || String(error);
  const errorCode = error.code || error.error?.code;
  const errorData = error.data || error.error?.data;
  
  // Check error message
  for (const retryableError of retryableErrors) {
    if (errorMessage.includes(retryableError)) {
      return true;
    }
  }
  
  // Check error code (string or number)
  if (errorCode) {
    const codeStr = String(errorCode);
    if (retryableErrors.includes(codeStr)) {
      return true;
    }
    // Also check if code matches any retryable error pattern
    for (const retryableError of retryableErrors) {
      if (codeStr.includes(retryableError)) {
        return true;
      }
    }
  }
  
  // Check error data for RPC error codes
  if (errorData && typeof errorData === 'object') {
    const dataCode = errorData.code;
    if (dataCode && retryableErrors.includes(String(dataCode))) {
      return true;
    }
  }
  
  // Network errors are always retryable
  if (errorCode === 'NETWORK_ERROR' || errorCode === 'TIMEOUT' || errorCode === -32603) {
    return true;
  }
  
  return false;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      console.warn(`⚠️ Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms:`, error.message || error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Retry multiple calls in parallel with individual retries
 * Uses Promise.allSettled to handle partial failures
 */
export async function retryAllSettled<T>(
  fns: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<{ success: boolean; value?: T; error?: any }>> {
  const results = await Promise.allSettled(
    fns.map(fn => retryWithBackoff(fn, options))
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, value: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}

/**
 * Batch calls with retry and parallel execution
 * Splits calls into batches to avoid overwhelming the RPC
 */
export async function batchRetry<T>(
  items: any[],
  fn: (item: any, index: number) => Promise<T>,
  batchSize: number = 10,
  options: RetryOptions = {}
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item, batchIndex) => 
      retryWithBackoff(() => fn(item, i + batchIndex), options)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, batchIndex) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`❌ Failed to fetch item ${i + batchIndex}:`, result.reason);
        // Continue with other items
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

