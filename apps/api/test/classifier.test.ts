import { describe, expect, it } from "vitest";
import { KeywordClassifierProvider } from "../src/requests/classification/keyword-classifier.provider";
import { SimulatedLlmClassifierProvider } from "../src/requests/classification/simulated-llm-classifier.provider";

describe("KeywordClassifierProvider", () => {
  const classifier = new KeywordClassifierProvider();

  it("classifies billing messages", async () => {
    const result = await classifier.classify(
      "Please fix my invoice and payment charge",
    );
    expect(result.category).toBe("billing");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("classifies sales messages", async () => {
    const result = await classifier.classify(
      "Can we get a demo of the pricing plans?",
    );
    expect(result.category).toBe("sales");
  });

  it("classifies support messages", async () => {
    const result = await classifier.classify(
      "The app is broken, getting an error on login",
    );
    expect(result.category).toBe("support");
  });

  it("returns unknown for unrelated text", async () => {
    const result = await classifier.classify("Hello there");
    expect(result.category).toBe("unknown");
    expect(result.confidence).toBe(0.4);
  });

  it("is case-insensitive", async () => {
    const result = await classifier.classify("MY INVOICE IS WRONG");
    expect(result.category).toBe("billing");
  });

  it("checks billing keywords before sales/support ones when a message mentions both", async () => {
    // "upgrade" would match sales and "invoice" matches billing - billing
    // wins because that regex runs first in the provider.
    const result = await classifier.classify(
      "I want to upgrade my plan but my invoice is wrong",
    );
    expect(result.category).toBe("billing");
  });
});

describe("SimulatedLlmClassifierProvider", () => {
  it("delegates to the keyword provider for the happy path", async () => {
    const provider = new SimulatedLlmClassifierProvider(
      new KeywordClassifierProvider(),
    );
    const result = await provider.classify(
      "Refund did not arrive after cancellation",
    );
    expect(result.category).toBe("billing");
  });

  it("falls back to the keyword provider if the model response cannot be parsed", async () => {
    const provider = new SimulatedLlmClassifierProvider(
      new KeywordClassifierProvider(),
    );
    // Simulate a real provider returning something that doesn't match the
    // schema we expect (timeout, malformed JSON, unexpected category, etc).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).callModel = async () => "not valid json";

    const result = await provider.classify("my payment was charged twice");

    expect(result.category).toBe("billing");
  });

  it("falls back when the model returns a well-formed but unexpected category", async () => {
    const provider = new SimulatedLlmClassifierProvider(
      new KeywordClassifierProvider(),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (provider as any).callModel = async () =>
      JSON.stringify({ category: "not-a-real-category", confidence: 0.9 });

    const result = await provider.classify("please help, the app is broken");

    expect(result.category).toBe("support");
  });
});
