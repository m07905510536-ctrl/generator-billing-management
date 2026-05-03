import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generatorsTable = pgTable("generators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  pricePerAmpereIqd: integer("price_per_ampere_iqd").notNull(),
  ownerId: integer("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGeneratorSchema = createInsertSchema(generatorsTable).omit({ id: true, createdAt: true });
export type InsertGenerator = z.infer<typeof insertGeneratorSchema>;
export type Generator = typeof generatorsTable.$inferSelect;
