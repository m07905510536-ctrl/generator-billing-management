import { Router } from "express";
import { db, expensesTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateExpenseBody, UpdateExpenseBody } from "@workspace/api-zod";

const router = Router();

const requireAuth = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(401).json({ error: "unauthorized" }); return; }
  req.currentUser = user;
  next();
};

router.get("/expenses", requireAuth, async (req, res) => {
  const { generatorId, month } = req.query as any;
  let query = db.select().from(expensesTable) as any;
  const conditions: any[] = [];
  if (generatorId) conditions.push(eq(expensesTable.generatorId, parseInt(generatorId)));
  if (month) conditions.push(sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${month}`);
  if (conditions.length > 0) query = query.where(and(...conditions));
  res.json(await query);
});

router.post("/expenses", requireAuth, async (req, res) => {
  if (!["owner", "admin"].includes(req.currentUser?.role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }
  const [expense] = await db.insert(expensesTable).values(parsed.data).returning();
  res.status(201).json(expense);
});

router.put("/expenses/:id", requireAuth, async (req, res) => {
  if (!["owner", "admin"].includes(req.currentUser?.role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const id = parseInt(req.params.id);
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error" }); return; }
  const [expense] = await db.update(expensesTable).set(parsed.data).where(eq(expensesTable.id, id)).returning();
  if (!expense) { res.status(404).json({ error: "not_found" }); return; }
  res.json(expense);
});

router.delete("/expenses/:id", requireAuth, async (req, res) => {
  if (!["owner", "admin"].includes(req.currentUser?.role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const id = parseInt(req.params.id);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.status(204).send();
});

export default router;
