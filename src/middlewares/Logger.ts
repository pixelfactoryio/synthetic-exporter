import { NextFunction, Request, Response, RequestHandler } from 'express';
import { Logger } from 'winston';

function loggerMiddleware(logger: Logger): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction): void {
    logger.info(`handled ${req.method} ${req.path}`, { req, res });
    next();
  };
}

export default loggerMiddleware;
