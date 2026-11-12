import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env file
dotenv.config()

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL environment variable is required'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters long for cryptographic security'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().optional(),
})
.refine(
  (data) => {
    if (data.NODE_ENV === 'production') {
      const weakSecrets = [
        'replace_with_secure_secret',
        'secret',
        '12345678',
        'gymvip_secret_key',
        'default_jwt_secret',
      ]
      if (weakSecrets.includes(data.JWT_SECRET.toLowerCase())) {
        return false
      }
    }
    return true
  },
  {
    message: 'JWT_SECRET must not use weak or placeholder default values in production',
    path: ['JWT_SECRET'],
  }
)

const parseEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ [GymVIP-Backend]: Invalid Environment Configuration:')
    console.error(result.error.format())
    throw new Error('Invalid environment variables. Please check your .env file.')
  }

  return result.data
}

export const env = parseEnv()
export type EnvConfig = z.infer<typeof envSchema>
