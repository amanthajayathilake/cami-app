import { randomUUID } from 'crypto';

export interface CustomerRequestInput {
  name: string;
  email: string;
  message: string;
}

export interface CustomerRequest extends CustomerRequestInput {
  id: string;
  createdAt: string;
}

const requests: CustomerRequest[] = [];

export function createRequest(input: CustomerRequestInput): CustomerRequest {
  const request: CustomerRequest = {
    id: randomUUID(),
    ...input,
    createdAt: new Date().toISOString()
  };

  requests.push(request);
  return request;
}

export function listRequests(): CustomerRequest[] {
  return requests;
}

export function clearRequests(): void {
  requests.length = 0;
}
