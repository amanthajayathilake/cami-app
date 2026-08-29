import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CustomerRequest } from "../customer-request.entity";
import { ClassificationCategory } from "./classifier-provider";

@Entity({ name: "classification_history" })
export class ClassificationHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // Nullable: classification can be run ad-hoc (no requestId) from the UI.
  @Column({ name: "request_id", type: "uuid", nullable: true })
  @Index()
  requestId!: string | null;

  @ManyToOne(() => CustomerRequest, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "request_id" })
  request?: CustomerRequest | null;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "varchar", length: 32 })
  @Index()
  category!: ClassificationCategory;

  @Column({ type: "float" })
  confidence!: number;

  // Provider type (e.g. "keyword", "llm").
  @Column({ type: "varchar", length: 64, default: "keyword" })
  provider!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
