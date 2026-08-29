import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest doesn't expose jest's global afterEach by default, so
// testing-library's automatic unmount-between-tests never kicks in unless
// we wire it up ourselves here.
afterEach(() => {
  cleanup();
});
