import { config } from "dotenv";
import { resolve } from "path";

// Loads the root .env file for local dev; no-ops if missing since CI/Docker
config({ path: resolve(__dirname, "../../../.env"), quiet: true });
