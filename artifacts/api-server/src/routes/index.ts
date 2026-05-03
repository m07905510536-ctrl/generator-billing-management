import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import generatorsRouter from "./generators";
import subscribersRouter from "./subscribers";
import invoicesRouter from "./invoices";
import expensesRouter from "./expenses";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(generatorsRouter);
router.use(subscribersRouter);
router.use(invoicesRouter);
router.use(expensesRouter);
router.use(dashboardRouter);

export default router;
