import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerRequest } from "./customer-request.entity";
import { RequestNote } from "./request-note.entity";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";
import { KeywordClassifier } from "./keyword-classifier";
import { REQUESTS_REPOSITORY } from "./persistence/requests.repository.port";
import { TypeOrmRequestsRepository } from "./persistence/typeorm-requests.repository";
import { ClassificationHistory } from "./classification/classification-history.entity";
import { ClassificationService } from "./classification/classification.service";
import { CLASSIFICATION_HISTORY_REPOSITORY } from "./classification/classification-history.repository.port";
import { TypeOrmClassificationHistoryRepository } from "./classification/typeorm-classification-history.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerRequest,
      RequestNote,
      ClassificationHistory,
    ]),
  ],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    ClassificationService,
    KeywordClassifier,
    { provide: REQUESTS_REPOSITORY, useClass: TypeOrmRequestsRepository },
    {
      provide: CLASSIFICATION_HISTORY_REPOSITORY,
      useClass: TypeOrmClassificationHistoryRepository,
    },
  ],
})
export class RequestsModule {}
