import {
  categorizeEmailRequestSchema,
  insightsRequestSchema,
  type CategorizeEmailRequest,
} from "@mailtracker/shared";
import { Router } from "express";
import pLimit from "p-limit";
import { z } from "zod";
import { categorizeEmail } from "../services/categorizer.js";
import { summarizeInbox } from "../services/insights.js";

export const aiRouter = Router();

const batchSchema = z.array(categorizeEmailRequestSchema);

aiRouter.post("/categorize", async (req, res, next) => {
  try {
    const body = categorizeEmailRequestSchema.parse(req.body);
    const out = await categorizeEmail(body);
    res.json(out);
  } catch (e) {
    next(e);
  }
});

aiRouter.post("/categorize-batch", async (req, res, next) => {
  try {
    const requests = batchSchema.parse(req.body) as CategorizeEmailRequest[];
    if (requests.length === 0) {
      res.json([]);
      return;
    }
    const limit = pLimit(4);
    const tasks = requests.map((r) =>
      limit(async () => {
        try {
          return await categorizeEmail(r);
        } catch {
          return {
            messageId: r.messageId,
            category: "Uncategorized",
            confidence: 0,
            reason: "AI backend unavailable",
            available: false,
          };
        }
      }),
    );
    const results = await Promise.all(tasks);
    res.json(results);
  } catch (e) {
    next(e);
  }
});

aiRouter.post("/insights", async (req, res, next) => {
  try {
    const body = insightsRequestSchema.parse(req.body);
    const out = await summarizeInbox(body);
    res.json(out);
  } catch (e) {
    next(e);
  }
});
