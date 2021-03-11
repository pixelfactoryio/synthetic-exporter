import ecsFormat from '@elastic/ecs-winston-format';
import { createLogger, transports } from 'winston';

import App from './App';
import LoggerMiddleware from './middlewares/Logger';
import ErrorMiddleware from './middlewares/Error';
import Home from './controllers/Home';
import Probe from './controllers/Probe';
import BrowserHandler from './handlers/browser';

const logger = createLogger({
  level: 'debug',
  format: ecsFormat({ convertReqRes: true }),
  transports: [new transports.Console()],
});

const wsEndpoint = process.env.WS_ENDPOINT || 'ws://localhost:3000';
const browserMaxConnRetry = process.env.BROWSER_MAX_CONNECTION_RETRY;

(async (): Promise<void> => {
  const app = new App({
    port: Number(process.env.PORT) || 8090,
    logger: logger,
    middlewares: [LoggerMiddleware(logger)],
    errorMiddlewares: [ErrorMiddleware(logger)],
    controllers: [
      new Home(),
      new Probe(
        Probe.WithLogger(logger),
        Probe.WithBrowserHandler(
          new BrowserHandler(
            BrowserHandler.WithLogger(logger),
            BrowserHandler.WithWsEndpoint(wsEndpoint),
            BrowserHandler.WithMaxConnectionRetry(Number(browserMaxConnRetry)),
          ),
        ),
      ),
    ],
  });

  app.listen();
})();
