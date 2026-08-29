export type ClassificationCategory =
  | "support"
  | "sales"
  | "billing"
  | "unknown";

export const CLASSIFICATION_CATEGORIES: ClassificationCategory[] = [
  "support",
  "sales",
  "billing",
  "unknown",
];

export type ClassificationResult = {
  category: ClassificationCategory;
  confidence: number;
};

export interface ClassifierProvider {
  classify(message: string): Promise<ClassificationResult>;
}

export const CLASSIFIER_PROVIDER = Symbol("CLASSIFIER_PROVIDER");
export const CLASSIFIER_PROVIDER_NAME = Symbol("CLASSIFIER_PROVIDER_NAME");
