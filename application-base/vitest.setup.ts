import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5433/test_db',
  NEXTAUTH_SECRET: 'test-secret-key-for-testing-only',
  AUTH_SECRET: 'test-secret-key-for-testing-only',
  NEXTAUTH_URL: 'http://localhost:3000',
  APP_URL: 'http://localhost:3000',
  APP_NAME: 'Aurora Nova Test',
  LOG_LEVEL: 'info',
})

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Export global test utilities
export { expect }
