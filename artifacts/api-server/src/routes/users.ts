import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!(req.session as any)?.userId) {
    res.status(401).json({ error: "unauthorized", message: "غير مسموح" });
    return;
  }
  next();
};

const requireOwner = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "owner") { res.status(403).json({ error: "forbidden", message: "صلاحيات المالك مطلوبة" }); return; }
  req.currentUser = user;
  next();
};

router.get("/users", requireOwner, async (req, res) => {
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    username: usersTable.username,
    role: usersTable.role,
    assignedGeneratorId: usersTable.assignedGeneratorId,
    createdAt: usersTable.createdAt,
  }).from(usersTable);
  res.json(users);
});

router.post("/users", requireOwner, async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const { name, username, password, role, assignedGeneratorId } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name, username, passwordHash, role, assignedGeneratorId: assignedGeneratorId ?? null,
  }).returning();
  res.status(201).json({
    id: user.id, name: user.name, username: user.username, role: user.role,
    assignedGeneratorId: user.assignedGeneratorId, createdAt: user.createdAt,
  });
});

router.get("/users/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [user] = await db.select({
    id: usersTable.id, name: usersTable.name, username: usersTable.username,
    role: usersTable.role, assignedGeneratorId: usersTable.assignedGeneratorId, createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "not_found" }); return; }
  res.json(user);
});

router.put("/users/:id", requireOwner, async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error" }); return; }
  const updates: any = { ...parsed.data };
  if (updates.password) {
    updates.passwordHash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ id: user.id, name: user.name, username: user.username, role: user.role, assignedGeneratorId: user.assignedGeneratorId, createdAt: user.createdAt });
});

router.delete("/users/:id", requireOwner, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

export default router;
