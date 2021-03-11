import express, { Application, RequestHandler, ErrorRequestHandler } from 'express';
import { Logger } from 'winston';
import { Controller } from './types';

class App {
  public app: Application;
  public PORT: number;
  public logger: Logger;

  constructor(config: {
    port: number;
    logger: Logger;
    middlewares: RequestHandler[];
    errorMiddlewares: ErrorRequestHandler[];
    controllers: Controller[];
  }) {
    this.app = express();
    this.PORT = config.port;
    this.logger = config.logger;
    this.middlewares(config.middlewares);
    this.controllers(config.controllers);
    this.errorMiddlewares(config.errorMiddlewares);
  }

  public listen(): void {
    this.app.listen(this.PORT, () => {
      this.logger.info(`App listening on the port ${this.PORT}`);
    });
  }

  public getServer(): express.Application {
    return this.app;
  }

  private middlewares(middlewares: RequestHandler[]): void {
    middlewares.forEach((middleware) => {
      this.app.use(middleware);
    });
  }

  private errorMiddlewares(middlewares: ErrorRequestHandler[]): void {
    middlewares.forEach((middleware) => {
      this.app.use(middleware);
    });
  }

  private controllers(controllers: Controller[]): void {
    controllers.forEach((controller) => {
      this.app.use('/', controller.router);
    });
  }
}

export default App;
