import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { CustomerRequest, RequestStatus } from "../customer-request.entity";
import { RequestNote } from "../request-note.entity";
import {
  ListRequestsOptions,
  RequestsPage,
  RequestsRepositoryPort,
} from "./requests.repository.port";

/** Raw data shape for the list query (snake_case columns). */
type ListRow = {
  id: string;
  message: string;
  status: RequestStatus;
  category: string | null;
  confidence: number | null;
  note_count: string; // Postgres COUNT(*) comes back as text
  latest_note_body: string | null;
  created_at: Date;
  updated_at: Date;
  total_count: string; // COUNT(*) OVER() same window total on every row
};

// Maps the validated sortBy value to the actual column/alias to order by.
const SORT_COLUMN: Record<string, string> = {
  createdAt: "r.created_at",
  status: "r.status",
  noteCount: "note_count",
};

@Injectable()
export class TypeOrmRequestsRepository implements RequestsRepositoryPort {
  constructor(
    @InjectRepository(CustomerRequest)
    private readonly requests: Repository<CustomerRequest>,
    @InjectRepository(RequestNote)
    private readonly notes: Repository<RequestNote>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // Single query for the requests page, notes included. Fixed N+1 problem with a lateral join for the latest note, and a subquery for the note counts.
  async findAllWithStats(options: ListRequestsOptions): Promise<RequestsPage> {
    const sortColumn = SORT_COLUMN[options.sortBy] ?? "r.created_at";
    const sortDir = options.sortDir === "asc" ? "ASC" : "DESC";
    const search = options.search ? `%${options.search}%` : null;
    const status = options.status ?? null;

    const rows = await this.dataSource.query<ListRow[]>(
      `
      SELECT
        r.id,
        r.message,
        r.status,
        r.category,
        r.confidence,
        r.created_at,
        r.updated_at,
        COALESCE(nc.note_count, 0) AS note_count,
        ln.body AS latest_note_body,
        COUNT(*) OVER() AS total_count
      FROM customer_requests r
      LEFT JOIN (
        SELECT request_id, COUNT(*) AS note_count
        FROM request_notes
        GROUP BY request_id
      ) nc ON nc.request_id = r.id
      LEFT JOIN LATERAL (
        SELECT body
        FROM request_notes n
        WHERE n.request_id = r.id
        ORDER BY n.created_at DESC
        LIMIT 1
      ) ln ON true
      WHERE ($1::text IS NULL OR r.message ILIKE $1)
        AND ($4::text IS NULL OR r.status = $4)
      ORDER BY ${sortColumn} ${sortDir}, r.created_at DESC, r.id ASC
      LIMIT $2 OFFSET $3
    `,
      [search, options.limit, options.offset, status],
    );

    return {
      items: rows.map((row) => ({
        id: row.id,
        message: row.message,
        status: row.status,
        category: row.category,
        confidence: row.confidence,
        noteCount: Number(row.note_count),
        latestNotePreview: row.latest_note_body,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      })),
      total: rows.length > 0 ? Number(rows[0].total_count) : 0,
      limit: options.limit,
      offset: options.offset,
    };
  }

  async findById(id: string): Promise<CustomerRequest | null> {
    return this.requests.findOne({
      where: { id },
      relations: { notes: true },
    });
  }

  async create(message: string): Promise<CustomerRequest> {
    const row = this.requests.create({
      message,
      status: "open",
      category: null,
      confidence: null,
    });

    return this.requests.save(row);
  }

  async updateStatus(
    id: string,
    status: RequestStatus,
  ): Promise<CustomerRequest | null> {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    existing.status = status;

    return this.requests.save(existing);
  }

  async save(request: CustomerRequest): Promise<CustomerRequest> {
    return this.requests.save(request);
  }
}
