import { randomUUIDv7 } from 'bun';

export function makeTestUser() {
  return {
    email: `test-${randomUUIDv7()}@example.com`,
    name: 'Test User',
    password: 'Password1!',
  };
}
