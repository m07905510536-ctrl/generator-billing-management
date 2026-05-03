import { pgTable, serial, integer, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoiceStatusEnum = pgEnum("invoice_status", ["paid", "partial", "unpaid"]);

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  generatorId: integer("generator_id").notNull(),
  workerId: integer("worker_id"),
  amperes: integer("amperes").notNull(),
  previousDebt: integer("previous_debt").notNull().default(0),
  amountExpected: integer("amount_expected").notNull(),
  amountReceived: integer("amount_received").notNull().default(0),
  monthYear: text("month_year").notNull(),
  status: invoiceStatusEnum("status").notNull().default("unpaid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
