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
import { ClassificationService } from "./classification/classification.service";
import { CreateRequestDto } from "./dto/create-request.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { ClassifyRequestDto } from "./dto/classify-request.dto";
import { HistoryQueryDto } from "./dto/history-query.dto";
import { RequestsQueryDto } from "./dto/requests-query.dto";
import { NotesQueryDto } from "./dto/notes-query.dto";
import { CreateNoteDto } from "./dto/create-note.dto";

@Controller("requests")
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly classificationService: ClassificationService,
  ) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.requestsService.list(RequestsQueryDto.fromQuery(query));
  }

  @Get("history")
  history(@Query() query: Record<string, unknown>) {
    return this.classificationService.listHistory(
      HistoryQueryDto.fromQuery(query),
    );
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.requestsService.getById(id);
  }

  @Get(":id/notes")
  listNotes(@Param("id") id: string, @Query() query: Record<string, unknown>) {
    const dto = NotesQueryDto.fromQuery(query);

    return this.requestsService.listNotes(id, dto.sortDir);
  }

  @Post(":id/notes")
  addNote(@Param("id") id: string, @Body() body: unknown) {
    const dto = CreateNoteDto.fromBody(body);

    return this.requestsService.addNote(id, dto.body, dto.authorName);
  }

  @Post()
  create(@Body() body: unknown) {
    const dto = CreateRequestDto.fromBody(body);

    return this.requestsService.create(dto.message);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() body: unknown) {
    const dto = UpdateStatusDto.fromBody(body);

    return this.requestsService.updateStatus(id, dto.status);
  }

  @Post("classify")
  classify(@Body() body: unknown) {
    const dto = ClassifyRequestDto.fromBody(body);

    return this.classificationService.classify(dto);
  }
}
