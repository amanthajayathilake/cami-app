import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerRequest } from "./customer-request.entity";
import { RequestNote } from "./request-note.entity";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";
import { REQUESTS_REPOSITORY } from "./persistence/requests.repository.port";
import { TypeOrmRequestsRepository } from "./persistence/typeorm-requests.repository";
import { ClassificationHistory } from "./classification/classification-history.entity";
import { ClassificationService } from "./classification/classification.service";
import {
  CLASSIFIER_PROVIDER,
  CLASSIFIER_PROVIDER_NAME,
} from "./classification/classifier-provider";
import { KeywordClassifierProvider } from "./classification/keyword-classifier.provider";
import { SimulatedLlmClassifierProvider } from "./classification/simulated-llm-classifier.provider";
import { CLASSIFICATION_HISTORY_REPOSITORY } from "./classification/classification-history.repository.port";
import { TypeOrmClassificationHistoryRepository } from "./classification/typeorm-classification-history.repository";

function resolveProviderName(): "keyword" | "llm" {
  return process.env.CLASSIFIER_PROVIDER === "llm" ? "llm" : "keyword";
}

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
    KeywordClassifierProvider,
    SimulatedLlmClassifierProvider,
    { provide: REQUESTS_REPOSITORY, useClass: TypeOrmRequestsRepository },
    {
      provide: CLASSIFICATION_HISTORY_REPOSITORY,
      useClass: TypeOrmClassificationHistoryRepository,
    },
    {
      provide: CLASSIFIER_PROVIDER,
      useFactory: (
        keyword: KeywordClassifierProvider,
        llm: SimulatedLlmClassifierProvider,
      ) => (resolveProviderName() === "llm" ? llm : keyword),
      inject: [KeywordClassifierProvider, SimulatedLlmClassifierProvider],
    },
    { provide: CLASSIFIER_PROVIDER_NAME, useFactory: resolveProviderName },
  ],
})
export class RequestsModule {}
