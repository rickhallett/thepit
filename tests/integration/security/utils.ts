/**
 * Security Test Utilities
 *
 * Shared utilities for integration security tests.
 */

// Base URL for integration tests - defaults to local dev server
export const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000'

/**
 * Make an HTTP request to the API
 */
export async function makeRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${BASE_URL}${path}`
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  })
}

/**
 * Check if server is reachable
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { method: 'HEAD' })
    return res.ok || res.status === 405 // HEAD might not be allowed
  } catch {
    return false
  }
}

/**
 * Test for timing attack resistance
 * Returns true if timing variance is within acceptable bounds
 */
export async function testTimingAttack(
  endpoint: string,
  tokenPrefix: string,
  iterations = 50
): Promise<{ passed: boolean; variance: number }> {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const token = tokenPrefix + 'x'.repeat(Math.max(0, 32 - tokenPrefix.length))
    const start = performance.now()
    await makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })
    times.push(performance.now() - start)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const variance = Math.sqrt(
    times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length
  )

  // Timing variance under 50ms is acceptable
  return { passed: variance < 50, variance }
}
