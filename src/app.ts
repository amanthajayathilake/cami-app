import express from 'express';
import { requestRouter } from './routes/requests';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/requests', requestRouter);
app.use(errorHandler);
