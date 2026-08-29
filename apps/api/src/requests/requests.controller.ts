import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { RequestsService } from "./requests.service";
import { RequestsQueryDto } from "./dto/requests-query.dto";
import { CreateRequestDto } from "./dto/create-request.dto";

@Controller("requests")
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.requestsService.list(RequestsQueryDto.fromQuery(query));
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.requestsService.getById(id);
  }

  @Post()
  create(@Body() body: unknown) {
    const dto = CreateRequestDto.fromBody(body);

    return this.requestsService.create(dto.message);
  }
}
