export type RequestCategory = 'support' | 'sales' | 'billing' | 'unknown';

export interface ClassificationResult {
  category: RequestCategory;
  confidence: number;
}

export function classifyMessage(message: string): ClassificationResult {
  // TODO: Candidate task
  // Implement a simple classifier or clean abstraction for future AI integration.
  // The current implementation is intentionally incomplete.
  return {
    category: 'unknown',
    confidence: 0.1
  };
}
