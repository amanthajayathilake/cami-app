import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const CI_WORKFLOW_PATH = resolve(
  __dirname,
  "../../../.github/workflows/ci.yml",
);

/**
 * Regression test for the planted CI bug: the Migrate step used to override
 * DATABASE_URL with a "cami_app" database the Postgres service never
 * creates, so migrations always failed on a clean checkout even though the
 * same commands worked locally. This reads the workflow file as plain text
 * (no need for a YAML parser dependency) and locks the fix in place.
 */
describe("CI workflow", () => {
  const workflow = readFileSync(CI_WORKFLOW_PATH, "utf8");

  it("declares a Postgres service database named cami", () => {
    expect(workflow).toMatch(/POSTGRES_DB:\s*cami\b/);
  });

  it("points the job-level DATABASE_URL at that same database", () => {
    expect(workflow).toMatch(
      /DATABASE_URL:\s*postgres:\/\/cami:cami@localhost:5432\/cami\s*$/m,
    );
  });

  it("never reintroduces the mismatched cami_app database name", () => {
    expect(workflow).not.toMatch(/cami_app/);
  });

  it("does not re-declare DATABASE_URL inside the Migrate step", () => {
    const afterMigrate = workflow.split("- name: Migrate")[1];
    expect(afterMigrate).toBeDefined();
    const migrateStepBody = afterMigrate!.split(/\n\s*- name:/)[0];
    expect(migrateStepBody).not.toMatch(/DATABASE_URL:/);
  });

  it("runs migrations after the test step, so a broken migration can't hide behind a green test run", () => {
    const testIndex = workflow.indexOf("- name: Test");
    const migrateIndex = workflow.indexOf("- name: Migrate");
    expect(testIndex).toBeGreaterThan(-1);
    expect(migrateIndex).toBeGreaterThan(testIndex);
  });
});
