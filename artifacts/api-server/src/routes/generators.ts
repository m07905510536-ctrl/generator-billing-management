import { Router } from "express";
import { db, generatorsTable, subscribersTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { CreateGeneratorBody, UpdateGeneratorBody } from "@workspace/api-zod";

const router = Router();

const requireAuth = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(401).json({ error: "unauthorized" }); return; }
  req.currentUser = user;
  next();
};

router.get("/generators", requireAuth, async (req, res) => {
  const generators = await db.select().from(generatorsTable);
  const withCounts = await Promise.all(generators.map(async (g) => {
    const [{ value }] = await db.select({ value: count() }).from(subscribersTable)
      .where(eq(subscribersTable.generatorId, g.id));
    return { ...g, activeSubscribersCount: Number(value) };
  }));
  res.json(withCounts);
});

router.post("/generators", requireAuth, async (req, res) => {
  if (req.currentUser?.role !== "owner") {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const parsed = CreateGeneratorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error" }); return; }
  const [generator] = await db.insert(generatorsTable).values({
    ...parsed.data, ownerId: req.currentUser.id,
  }).returning();
  res.status(201).json({ ...generator, activeSubscribersCount: 0 });
});

router.get("/generators/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [generator] = await db.select().from(generatorsTable).where(eq(generatorsTable.id, id)).limit(1);
  if (!generator) { res.status(404).json({ error: "not_found" }); return; }
  const [{ value }] = await db.select({ value: count() }).from(subscribersTable).where(eq(subscribersTable.generatorId, id));
  res.json({ ...generator, activeSubscribersCount: Number(value) });
});

router.put("/generators/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateGeneratorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error" }); return; }
  const [generator] = await db.update(generatorsTable).set(parsed.data).where(eq(generatorsTable.id, id)).returning();
  if (!generator) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ ...generator, activeSubscribersCount: 0 });
});

router.delete("/generators/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(generatorsTable).where(eq(generatorsTable.id, id));
  res.status(204).send();
});

export default router;
