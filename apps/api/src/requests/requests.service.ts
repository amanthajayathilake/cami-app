import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CustomerRequest, RequestStatus } from "./customer-request.entity";
import {
  ListRequestsOptions,
  REQUESTS_REPOSITORY,
  RequestNoteItem,
  RequestsPage,
  RequestsRepositoryPort,
  SortDirection,
} from "./persistence/requests.repository.port";

export type { RequestListItem } from "./persistence/requests.repository.port";

@Injectable()
export class RequestsService {
  constructor(
    @Inject(REQUESTS_REPOSITORY)
    private readonly repository: RequestsRepositoryPort,
  ) {}

  list(options: ListRequestsOptions): Promise<RequestsPage> {
    return this.repository.findAllWithStats(options);
  }

  async getById(id: string): Promise<CustomerRequest> {
    const row = await this.repository.findById(id);

    if (!row) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    return row;
  }

  async updateStatus(
    id: string,
    status: RequestStatus,
  ): Promise<CustomerRequest> {
    const updated = await this.repository.updateStatus(id, status);

    if (!updated) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    return updated;
  }

  create(message: string): Promise<CustomerRequest> {
    return this.repository.create(message);
  }

  save(request: CustomerRequest): Promise<CustomerRequest> {
    return this.repository.save(request);
  }

  async listNotes(
    requestId: string,
    sortDir: SortDirection,
  ): Promise<RequestNoteItem[]> {
    await this.getById(requestId);

    return this.repository.listNotes(requestId, sortDir);
  }

  async addNote(
    requestId: string,
    body: string,
    authorName: string,
  ): Promise<RequestNoteItem> {
    await this.getById(requestId);

    return this.repository.addNote(requestId, body, authorName);
  }
}
