import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriberStatusEnum = pgEnum("subscriber_status", ["active", "paused"]);

export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  breakerOwnerName: text("breaker_owner_name").notNull(),
  phoneNumber: text("phone_number"),
  generatorId: integer("generator_id").notNull(),
  defaultAmperes: integer("default_amperes").notNull(),
  status: subscriberStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriberSchema = createInsertSchema(subscribersTable).omit({ id: true, createdAt: true });
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribersTable.$inferSelect;
