import { useCallback, useRef } from "react";

interface StreamBatch {
  lines: string[];
  context: any;
}

interface DebouncedStreamOptions {
  delay?: number;
  maxBatchSize?: number;
}

/**
 * Custom hook for debouncing stream processing to reduce rendering overhead
 * Batches rapid stream updates and processes them together
 */
export function useDebouncedStreamProcessing(
  processFunction: (lines: string[], context: any) => void,
  options: DebouncedStreamOptions = {}
) {
  const { delay = 16, maxBatchSize = 10 } = options; // ~60fps by default
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchRef = useRef<StreamBatch>({ lines: [], context: null });
  const frameRef = useRef<number | null>(null);

  const flushBatch = useCallback(() => {
    if (batchRef.current.lines.length > 0) {
      // Use requestAnimationFrame for smoother UI updates
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      frameRef.current = requestAnimationFrame(() => {
        processFunction(batchRef.current.lines, batchRef.current.context);
        batchRef.current.lines = [];
        frameRef.current = null;
      });
    }
  }, [processFunction]);

  const debouncedProcess = useCallback((line: string, context: any) => {
    // Add to batch
    batchRef.current.lines.push(line);
    batchRef.current.context = context;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If batch is full, flush immediately
    if (batchRef.current.lines.length >= maxBatchSize) {
      flushBatch();
      return;
    }

    // Otherwise, set timeout for debounced processing
    timeoutRef.current = setTimeout(flushBatch, delay);
  }, [flushBatch, delay, maxBatchSize]);

  const forceFlush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    flushBatch();
  }, [flushBatch]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  return {
    debouncedProcess,
    forceFlush,
    cleanup,
  };
}