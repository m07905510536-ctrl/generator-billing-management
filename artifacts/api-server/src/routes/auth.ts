import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid input" });
    return;
  }

  const { username, password } = parsed.data;

  const users = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  const user = users[0];

  if (!user) {
    res.status(401).json({ error: "invalid_credentials", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "invalid_credentials", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }

  (req.session as any).userId = user.id;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      assignedGeneratorId: user.assignedGeneratorId,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "غير مسموح" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const user = users[0];
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "غير مسموح" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    assignedGeneratorId: user.assignedGeneratorId,
    createdAt: user.createdAt,
  });
});

export default router;
