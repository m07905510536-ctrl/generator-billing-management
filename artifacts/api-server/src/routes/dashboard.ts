import { Router } from "express";
import { db, invoicesTable, subscribersTable, expensesTable, generatorsTable, usersTable } from "@workspace/db";
import { eq, and, sql, sum, count } from "drizzle-orm";

const router = Router();

const requireAuth = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(401).json({ error: "unauthorized" }); return; }
  req.currentUser = user;
  next();
};

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const { generatorId, monthYear } = req.query as any;

  const invConditions: any[] = [];
  const expConditions: any[] = [];
  const subConditions: any[] = [];

  if (generatorId) {
    invConditions.push(eq(invoicesTable.generatorId, parseInt(generatorId)));
    expConditions.push(eq(expensesTable.generatorId, parseInt(generatorId)));
    subConditions.push(eq(subscribersTable.generatorId, parseInt(generatorId)));
  }
  if (monthYear) invConditions.push(eq(invoicesTable.monthYear, monthYear));
  if (monthYear) expConditions.push(sql`to_char(${expensesTable.date}::date, 'YYYY-MM') = ${monthYear}`);

  let invQuery = db.select({
    totalExpected: sum(invoicesTable.amountExpected),
    totalReceived: sum(invoicesTable.amountReceived),
    paidCount: count(sql`CASE WHEN ${invoicesTable.status} = 'paid' THEN 1 END`),
    partialCount: count(sql`CASE WHEN ${invoicesTable.status} = 'partial' THEN 1 END`),
    unpaidCount: count(sql`CASE WHEN ${invoicesTable.status} = 'unpaid' THEN 1 END`),
  }).from(invoicesTable) as any;
  if (invConditions.length > 0) invQuery = invQuery.where(and(...invConditions));

  let expQuery = db.select({ totalExpenses: sum(expensesTable.amount) }).from(expensesTable) as any;
  if (expConditions.length > 0) expQuery = expQuery.where(and(...expConditions));

  let subQuery = db.select({ activeCount: count() }).from(subscribersTable).where(
    and(eq(subscribersTable.status, "active"), ...(generatorId ? [eq(subscribersTable.generatorId, parseInt(generatorId))] : []))
  ) as any;

  const [invStats] = await invQuery;
  const [expStats] = await expQuery;
  const [subStats] = await subQuery;

  const totalExpectedRevenue = Number(invStats.totalExpected) || 0;
  const totalCollected = Number(invStats.totalReceived) || 0;
  const totalExpenses = Number(expStats.totalExpenses) || 0;
  const netProfit = totalCollected - totalExpenses;
  const collectionRate = totalExpectedRevenue > 0 ? (totalCollected / totalExpectedRevenue) * 100 : 0;

  res.json({
    totalExpectedRevenue,
    totalCollected,
    totalOutstanding: totalExpectedRevenue - totalCollected,
    totalExpenses,
    netProfit,
    activeSubscribersCount: Number(subStats.activeCount) || 0,
    paidCount: Number(invStats.paidCount) || 0,
    partialCount: Number(invStats.partialCount) || 0,
    unpaidCount: Number(invStats.unpaidCount) || 0,
    collectionRate,
  });
});

router.get("/dashboard/financial-history", requireAuth, async (req, res) => {
  const { generatorId, year } = req.query as any;

  const conditions: any[] = [];
  const expConditions: any[] = [];
  if (generatorId) {
    conditions.push(eq(invoicesTable.generatorId, parseInt(generatorId)));
    expConditions.push(eq(expensesTable.generatorId, parseInt(generatorId)));
  }
  if (year) {
    conditions.push(sql`LEFT(${invoicesTable.monthYear}, 4) = ${String(year)}`);
    expConditions.push(sql`EXTRACT(YEAR FROM ${expensesTable.date}::date) = ${parseInt(year)}`);
  }

  let invQuery = db.select({
    monthYear: invoicesTable.monthYear,
    revenue: sum(invoicesTable.amountReceived),
    invoiceCount: count(),
    paidCount: count(sql`CASE WHEN ${invoicesTable.status} = 'paid' THEN 1 END`),
  }).from(invoicesTable).groupBy(invoicesTable.monthYear).orderBy(invoicesTable.monthYear) as any;
  if (conditions.length > 0) invQuery = invQuery.where(and(...conditions));

  let expQuery = db.select({
    monthYear: sql<string>`to_char(${expensesTable.date}::date, 'YYYY-MM')`,
    expenses: sum(expensesTable.amount),
  }).from(expensesTable).groupBy(sql`to_char(${expensesTable.date}::date, 'YYYY-MM')`) as any;
  if (expConditions.length > 0) expQuery = expQuery.where(and(...expConditions));

  const [invRows, expRows] = await Promise.all([invQuery, expQuery]);
  const expByMonth = new Map(expRows.map((r: any) => [r.monthYear, Number(r.expenses) || 0]));

  const result = invRows.map((row: any) => {
    const revenue = Number(row.revenue) || 0;
    const expenses = expByMonth.get(row.monthYear) || 0;
    return {
      monthYear: row.monthYear,
      revenue,
      expenses,
      netProfit: revenue - expenses,
      invoiceCount: Number(row.invoiceCount) || 0,
      paidCount: Number(row.paidCount) || 0,
    };
  });

  res.json(result);
});

router.get("/dashboard/recent-transactions", requireAuth, async (req, res) => {
  const { generatorId, limit = "20" } = req.query as any;
  const lim = Math.min(parseInt(limit), 100);

  let query = db.select({
    id: invoicesTable.id,
    subscriberName: subscribersTable.name,
    breakerOwnerName: subscribersTable.breakerOwnerName,
    generatorName: generatorsTable.name,
    workerName: usersTable.name,
    amountExpected: invoicesTable.amountExpected,
    amountReceived: invoicesTable.amountReceived,
    status: invoicesTable.status,
    monthYear: invoicesTable.monthYear,
    createdAt: invoicesTable.createdAt,
  }).from(invoicesTable)
    .leftJoin(subscribersTable, eq(invoicesTable.subscriberId, subscribersTable.id))
    .leftJoin(generatorsTable, eq(invoicesTable.generatorId, generatorsTable.id))
    .leftJoin(usersTable, eq(invoicesTable.workerId, usersTable.id))
    .orderBy(sql`${invoicesTable.createdAt} DESC`)
    .limit(lim) as any;

  if (generatorId) query = query.where(eq(invoicesTable.generatorId, parseInt(generatorId)));

  const rows = await query;
  res.json(rows);
});

router.get("/dashboard/invoice-status-breakdown", requireAuth, async (req, res) => {
  const { generatorId, monthYear } = req.query as any;

  const conditions: any[] = [];
  if (generatorId) conditions.push(eq(invoicesTable.generatorId, parseInt(generatorId)));
  if (monthYear) conditions.push(eq(invoicesTable.monthYear, monthYear));

  let query = db.select({
    status: invoicesTable.status,
    totalAmount: sum(invoicesTable.amountExpected),
    collectedAmount: sum(invoicesTable.amountReceived),
    cnt: count(),
  }).from(invoicesTable).groupBy(invoicesTable.status) as any;
  if (conditions.length > 0) query = query.where(and(...conditions));

  const rows = await query;
  const result = { paid: 0, partial: 0, unpaid: 0, totalAmount: 0, collectedAmount: 0 };
  for (const row of rows) {
    (result as any)[row.status] = Number(row.cnt) || 0;
    result.totalAmount += Number(row.totalAmount) || 0;
    result.collectedAmount += Number(row.collectedAmount) || 0;
  }
  res.json(result);
});

export default router;
