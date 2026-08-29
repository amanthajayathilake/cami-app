import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClassificationHistory } from "./classification-history.entity";
import {
  ClassificationHistoryRecord,
  ClassificationHistoryRepositoryPort,
  CreateHistoryEntryInput,
  HistoryFilter,
  HistoryPage,
} from "./classification-history.repository.port";

@Injectable()
export class TypeOrmClassificationHistoryRepository
  implements ClassificationHistoryRepositoryPort
{
  constructor(
    @InjectRepository(ClassificationHistory)
    private readonly history: Repository<ClassificationHistory>,
  ) {}

  async record(
    entry: CreateHistoryEntryInput,
  ): Promise<ClassificationHistoryRecord> {
    const row = this.history.create(entry);
    const saved = await this.history.save(row);
    return this.toRecord(saved);
  }

  async findMany(filter: HistoryFilter): Promise<HistoryPage> {
    const [rows, total] = await this.history.findAndCount({
      where: filter.category ? { category: filter.category } : {},
      order: { createdAt: "DESC" },
      take: filter.limit,
      skip: filter.offset,
    });

    return {
      items: rows.map((row) => this.toRecord(row)),
      total,
      limit: filter.limit,
      offset: filter.offset,
    };
  }

  private toRecord(row: ClassificationHistory): ClassificationHistoryRecord {
    return {
      id: row.id,
      requestId: row.requestId,
      message: row.message,
      category: row.category,
      confidence: row.confidence,
      provider: row.provider,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
