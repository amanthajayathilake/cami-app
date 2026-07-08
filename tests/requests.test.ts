import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { app } from '../src/app';
import { clearRequests } from '../src/storage/requestStore';

describe('requests API', () => {
  beforeEach(() => {
    clearRequests();
  });

  it('returns health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('creates a customer request', async () => {
    const response = await request(app).post('/requests').send({
      name: 'Malen',
      email: 'malen@example.com',
      message: 'I need help with my account'
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: 'Malen',
      email: 'malen@example.com',
      message: 'I need help with my account'
    });
    expect(response.body.data.id).toBeDefined();
  });

  it('rejects invalid customer request payloads', async () => {
    const response = await request(app).post('/requests').send({
      name: '',
      email: 'not-an-email',
      message: ''
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('ValidationError');
  });

  it('classifies billing requests', async () => {
    const response = await request(app).post('/requests/classify').send({
      message: 'I need help changing my payment method'
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      category: 'billing',
      confidence: expect.any(Number)
    });
    expect(response.body.confidence).toBeGreaterThanOrEqual(0.5);
  });
});
