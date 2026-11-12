import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { AnyZodObject, ZodEffects } from 'zod'

export const validate = (
  schema: AnyZodObject | ZodEffects<AnyZodObject>,
  target: 'body' | 'query' | 'params' = 'body'
): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (target === 'query') {
        req.query = await schema.parseAsync(req.query)
      } else if (target === 'params') {
        req.params = await schema.parseAsync(req.params)
      } else {
        req.body = await schema.parseAsync(req.body)
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export const validateBody = (schema: AnyZodObject | ZodEffects<AnyZodObject>): RequestHandler => {
  return validate(schema, 'body')
}
