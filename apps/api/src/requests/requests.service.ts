import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CustomerRequest, RequestStatus } from "./customer-request.entity";
import {
  ListRequestsOptions,
  REQUESTS_REPOSITORY,
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
}
