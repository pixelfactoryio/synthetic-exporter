import { AnySchema, ValidationError } from 'yup';
import { Request, Response, NextFunction, RequestHandler } from 'express';

import HttpException from '../exceptions/HttpException';

function ValidateDto(schema: AnySchema): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await schema.validate(req.query);
      next();
    } catch (e) {
      if (e instanceof ValidationError) {
        next(new HttpException(400, e.message));
      } else {
        next(e);
      }
    }
  };
}

export default ValidateDto;
