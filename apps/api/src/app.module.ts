import "./load-env";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerRequest } from "./requests/customer-request.entity";
import { RequestNote } from "./requests/request-note.entity";
import { ClassificationHistory } from "./requests/classification/classification-history.entity";
import { RequestsModule } from "./requests/requests.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url:
        process.env.DATABASE_URL ?? "postgres://cami:cami@localhost:5432/cami",
      entities: [CustomerRequest, RequestNote, ClassificationHistory],
      synchronize: false,
      logging: ["query"],
    }),
    RequestsModule,
  ],
})
export class AppModule {}
