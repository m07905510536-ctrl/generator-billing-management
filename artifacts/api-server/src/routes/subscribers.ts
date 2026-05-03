import { Router } from "express";
import { db, subscribersTable, invoicesTable, usersTable } from "@workspace/db";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { CreateSubscriberBody, UpdateSubscriberBody } from "@workspace/api-zod";

const router = Router();

const requireAuth = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(401).json({ error: "unauthorized" }); return; }
  req.currentUser = user;
  next();
};

const computeCurrentDebt = async (subscriberId: number): Promise<number> => {
  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.subscriberId, subscriberId));
  return invoices.reduce((debt, inv) => {
    const remaining = inv.amountExpected - inv.amountReceived;
    return debt + Math.max(0, remaining);
  }, 0);
};

router.get("/subscribers", requireAuth, async (req, res) => {
  const { generatorId, search, status } = req.query as any;
  let query = db.select().from(subscribersTable) as any;
  const conditions: any[] = [];
  if (generatorId) conditions.push(eq(subscribersTable.generatorId, parseInt(generatorId)));
  if (status) conditions.push(eq(subscribersTable.status, status));
  if (search) {
    conditions.push(or(
      ilike(subscribersTable.name, `%${search}%`),
      ilike(subscribersTable.breakerOwnerName, `%${search}%`),
    ));
  }
  if (conditions.length > 0) query = query.where(and(...conditions));
  const subscribers = await query;
  const withDebt = await Promise.all(subscribers.map(async (s: any) => ({
    ...s, currentDebt: await computeCurrentDebt(s.id),
  })));
  res.json(withDebt);
});

router.post("/subscribers", requireAuth, async (req, res) => {
  const parsed = CreateSubscriberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }
  const [sub] = await db.insert(subscribersTable).values(parsed.data).returning();
  res.status(201).json({ ...sub, currentDebt: 0 });
});

router.get("/subscribers/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [sub] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, id)).limit(1);
  if (!sub) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ ...sub, currentDebt: await computeCurrentDebt(id) });
});

router.put("/subscribers/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateSubscriberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error" }); return; }
  const [sub] = await db.update(subscribersTable).set(parsed.data).where(eq(subscribersTable.id, id)).returning();
  if (!sub) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ ...sub, currentDebt: await computeCurrentDebt(id) });
});

router.delete("/subscribers/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(subscribersTable).where(eq(subscribersTable.id, id));
  res.status(204).send();
});

export default router;
