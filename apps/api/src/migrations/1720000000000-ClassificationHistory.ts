import { MigrationInterface, QueryRunner } from "typeorm";

export class ClassificationHistory1720000000000 implements MigrationInterface {
  name = "ClassificationHistory1720000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS classification_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id uuid NULL REFERENCES customer_requests(id) ON DELETE SET NULL,
        message text NOT NULL,
        category varchar(32) NOT NULL,
        confidence double precision NOT NULL,
        provider varchar(64) NOT NULL DEFAULT 'keyword',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_classification_history_request_id
      ON classification_history(request_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_classification_history_category
      ON classification_history(category);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_classification_history_category_created_at
      ON classification_history(category, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS classification_history;`);
  }
}
