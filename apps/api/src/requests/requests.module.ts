import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerRequest } from "./customer-request.entity";
import { RequestNote } from "./request-note.entity";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";
import { KeywordClassifier } from "./keyword-classifier";
import { REQUESTS_REPOSITORY } from "./persistence/requests.repository.port";
import { TypeOrmRequestsRepository } from "./persistence/typeorm-requests.repository";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRequest, RequestNote])],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    KeywordClassifier,
    { provide: REQUESTS_REPOSITORY, useClass: TypeOrmRequestsRepository },
  ],
})
export class RequestsModule {}
