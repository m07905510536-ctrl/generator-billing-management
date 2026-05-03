import { Router } from "express";
import { db, invoicesTable, subscribersTable, generatorsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateInvoiceBody, UpdateInvoiceBody, BulkGenerateInvoicesBody } from "@workspace/api-zod";

const router = Router();

const requireAuth = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(401).json({ error: "unauthorized" }); return; }
  req.currentUser = user;
  next();
};

const enrichInvoice = async (inv: any) => {
  const [subscriber] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, inv.subscriberId)).limit(1);
  const [worker] = inv.workerId
    ? await db.select({ id: usersTable.id, name: usersTable.name, username: usersTable.username, role: usersTable.role, assignedGeneratorId: usersTable.assignedGeneratorId, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, inv.workerId)).limit(1)
    : [null];
  return { ...inv, subscriber: subscriber ? { ...subscriber, currentDebt: 0 } : null, worker: worker || null };
};

router.get("/invoices", requireAuth, async (req, res) => {
  const { generatorId, subscriberId, workerId, monthYear, status } = req.query as any;
  let query = db.select().from(invoicesTable) as any;
  const conditions: any[] = [];
  if (generatorId) conditions.push(eq(invoicesTable.generatorId, parseInt(generatorId)));
  if (subscriberId) conditions.push(eq(invoicesTable.subscriberId, parseInt(subscriberId)));
  if (workerId) conditions.push(eq(invoicesTable.workerId, parseInt(workerId)));
  if (monthYear) conditions.push(eq(invoicesTable.monthYear, monthYear));
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (conditions.length > 0) query = query.where(and(...conditions));
  const invoices = await query;
  const enriched = await Promise.all(invoices.map(enrichInvoice));
  res.json(enriched);
});

router.post("/invoices", requireAuth, async (req, res) => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }
  const { subscriberId, generatorId, amperes, previousDebt = 0, amountReceived, monthYear, notes } = parsed.data;

  const [generator] = await db.select().from(generatorsTable).where(eq(generatorsTable.id, generatorId)).limit(1);
  if (!generator) { res.status(404).json({ error: "generator_not_found" }); return; }

  const amountExpected = (amperes * generator.pricePerAmpereIqd) + previousDebt;
  let status: "paid" | "partial" | "unpaid" = "unpaid";
  if (amountReceived >= amountExpected) status = "paid";
  else if (amountReceived > 0) status = "partial";

  const [invoice] = await db.insert(invoicesTable).values({
    subscriberId, generatorId, workerId: req.currentUser.id,
    amperes, previousDebt, amountExpected, amountReceived,
    monthYear, status, notes: notes ?? null,
  }).returning();

  res.status(201).json(await enrichInvoice(invoice));
});

router.post("/invoices/bulk-generate", requireAuth, async (req, res) => {
  if (!["owner", "admin"].includes(req.currentUser?.role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const parsed = BulkGenerateInvoicesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error" }); return; }
  const { generatorId, monthYear } = parsed.data;

  const [generator] = await db.select().from(generatorsTable).where(eq(generatorsTable.id, generatorId)).limit(1);
  if (!generator) { res.status(404).json({ error: "generator_not_found" }); return; }

  const activeSubscribers = await db.select().from(subscribersTable)
    .where(and(eq(subscribersTable.generatorId, generatorId), eq(subscribersTable.status, "active")));

  const existingInvoices = await db.select({ subscriberId: invoicesTable.subscriberId })
    .from(invoicesTable).where(and(eq(invoicesTable.generatorId, generatorId), eq(invoicesTable.monthYear, monthYear)));
  const existingSubscriberIds = new Set(existingInvoices.map((i) => i.subscriberId));

  const toGenerate = activeSubscribers.filter((s) => !existingSubscriberIds.has(s.id));
  const created: any[] = [];

  for (const sub of toGenerate) {
    const previousInvoices = await db.select().from(invoicesTable)
      .where(eq(invoicesTable.subscriberId, sub.id));
    const previousDebt = previousInvoices.reduce((debt, inv) => {
      return debt + Math.max(0, inv.amountExpected - inv.amountReceived);
    }, 0);

    const amountExpected = (sub.defaultAmperes * generator.pricePerAmpereIqd) + previousDebt;
    const [invoice] = await db.insert(invoicesTable).values({
      subscriberId: sub.id, generatorId, workerId: null,
      amperes: sub.defaultAmperes, previousDebt, amountExpected,
      amountReceived: 0, monthYear, status: "unpaid", notes: null,
    }).returning();
    created.push(invoice);
  }

  res.json({
    generated: created.length,
    skipped: existingSubscriberIds.size,
    monthYear,
    invoices: await Promise.all(created.map(enrichInvoice)),
  });
});

router.get("/invoices/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
  if (!inv) { res.status(404).json({ error: "not_found" }); return; }
  res.json(await enrichInvoice(inv));
});

router.put("/invoices/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error" }); return; }

  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "not_found" }); return; }

  const updates: any = { ...parsed.data };
  if (updates.amountReceived !== undefined) {
    if (updates.amountReceived >= existing.amountExpected) updates.status = "paid";
    else if (updates.amountReceived > 0) updates.status = "partial";
    else updates.status = "unpaid";
  }

  const [inv] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
  res.json(await enrichInvoice(inv));
});

export default router;
