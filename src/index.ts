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
const browserMaxConnRetry = process.env.BROWSER_MAX_CONNECTION_RETRY || '5';

/**
 * Initialize BrowserHandler
 */
const bh = new BrowserHandler(
  BrowserHandler.WithWsEndpoint(wsEndpoint),
  BrowserHandler.WithMaxConnectionRetry(Number(browserMaxConnRetry)),
);

bh.on('error', (e) => {
  logger.error('an error happened', { err: e });
  process.exit(1);
});

bh.on('connection_retry', (e, attemptNumber: number) => {
  logger.warn(`trying to reconnect browser ${wsEndpoint}`, { err: e, attemptNumber: attemptNumber });
});

/**
 * Initialize Probe
 */
const probe = new Probe(Probe.WithLogger(logger), Probe.WithBrowserHandler(bh));

/**
 * Initialize App
 */
const app = new App({
  port: Number(process.env.PORT) || 8090,
  logger: logger,
  middlewares: [LoggerMiddleware(logger)],
  errorMiddlewares: [ErrorMiddleware(logger)],
  controllers: [new Home(), probe],
});

(async (): Promise<void> => {
  await bh.initBrowser();
  app.listen();
})();
