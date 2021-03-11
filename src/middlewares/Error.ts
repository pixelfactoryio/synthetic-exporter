import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Logger } from 'winston';
import HttpException from '../exceptions/HttpException';

function ErrorMiddleware(logger: Logger): ErrorRequestHandler {
  return function (error: HttpException, req: Request, res: Response, next: NextFunction): void {
    const status = error.status || 500;
    const message = error.message || 'something went wrong';
    res.status(status).send({
      message,
      status,
    });
    logger.error(`error handling ${req.method} ${req.path}`, { error });
  };
}

export default ErrorMiddleware;
