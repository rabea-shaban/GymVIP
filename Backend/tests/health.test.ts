import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import * as dbConfig from '../src/config/database.js'

describe('GymVIP API Health & Foundation Tests', () => {
  describe('GET /api/v1/health', () => {
    it('should return 200 and operational health status with environment', async () => {
      const res = await request(app).get('/api/v1/health')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('message', 'GymVIP API is running')
      expect(res.body.data).toHaveProperty('environment')
    })
  })

  describe('GET /api/v1/health/database', () => {
    it('should return 200 when database connection is healthy', async () => {
      // Mock database connection to return true
      const checkSpy = vi
        .spyOn(dbConfig, 'checkDatabaseConnection')
        .mockResolvedValueOnce(true)

      const res = await request(app).get('/api/v1/health/database')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('success', true)
      expect(res.body).toHaveProperty('message', 'Database connection is healthy')

      checkSpy.mockRestore()
    })

    it('should return 503 when database connection is unavailable', async () => {
      // Mock database connection to return false
      const checkSpy = vi
        .spyOn(dbConfig, 'checkDatabaseConnection')
        .mockResolvedValueOnce(false)

      const res = await request(app).get('/api/v1/health/database')

      expect(res.status).toBe(503)
      expect(res.body).toHaveProperty('success', false)
      expect(res.body).toHaveProperty(
        'message',
        'Database connection is unavailable or unreachable'
      )
      expect(res.body.errors).toBeDefined()

      checkSpy.mockRestore()
    })
  })

  describe('404 Not Found Middleware', () => {
    it('should return 404 with structured error response for unmapped routes', async () => {
      const res = await request(app).get('/api/v1/non-existent-route')

      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('success', false)
      expect(res.body.message).toContain('غير موجود')
      expect(res.body.errors).toBeInstanceOf(Array)
    })
  })
})
