import { Router } from 'express';
import { z } from 'zod';
import { createRequest, listRequests } from '../storage/requestStore';

export const requestRouter = Router();

const createRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1)
});

requestRouter.get('/', (_req, res) => {
  res.json({ data: listRequests() });
});

requestRouter.post('/', (req, res, next) => {
  try {
    const payload = createRequestSchema.parse(req.body);
    const request = createRequest(payload);
    res.status(201).json({ data: request });
  } catch (error) {
    next(error);
  }
});

// TODO: Candidate task
// Add POST /requests/classify
// It should accept { "message": "..." }
// It should return { "category": "billing|support|sales|unknown", "confidence": number }
