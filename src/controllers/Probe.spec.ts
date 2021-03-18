import request from 'supertest';
import { Application } from 'express';
import { chromium, BrowserServer } from 'playwright';
import { createLogger, transports } from 'winston';

import App from '../App';
import Probe from './Probe';
import BrowserHandler from '../handlers/browser';
import LoggerMiddleware from '../middlewares/Logger';
import ErrorMiddleware from '../middlewares/Error';

const logger = createLogger({
  level: 'debug',
  transports: [new transports.Console({ silent: true })],
});

let app: Application;
let bh: BrowserHandler;
let bs: BrowserServer;

beforeAll(async () => {
  bs = await chromium.launchServer();
  const wsEndpoint = bs.wsEndpoint();

  bh = await BrowserHandler.Build(
    BrowserHandler.WithWsEndpoint(wsEndpoint),
    BrowserHandler.WithMaxConnectionRetry(Number(0)),
  );

  const probe = new Probe(Probe.WithLogger(logger), Probe.WithBrowserHandler(bh));
  app = new App({
    middlewares: [LoggerMiddleware(logger)],
    errorMiddlewares: [ErrorMiddleware(logger)],
    controllers: [probe],
  }).app;
});

afterAll(async () => {
  await bh.close();
  await bs.close();
});

describe('Probe', () => {
  it('Should fail with target param is required', async () => {
    const result = await request(app).get('/probe');

    expect(result.status).toBe(400);
    expect(result.body.status).toBe(400);
    expect(result.body.message).toBe('target is a required field');
    expect(result.headers['content-type']).toMatch(/json/);
  });

  it('Should fail with target param is not a valid url', async () => {
    const result = await request(app).get('/probe').query({ target: 'not_a_valid_url' });

    expect(result.status).toBe(400);
    expect(result.body.status).toBe(400);
    expect(result.body.message).toBe('target must be a valid URL');
    expect(result.headers['content-type']).toMatch(/json/);
  });

  it('Should return probe_success ok', async () => {
    const result = await request(app)
      .get('/probe')
      .query({ target: 'https://github.com/pixelfactoryio/synthetic-exporter' });

    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toMatch(/text/);
    expect(result.text).toMatch(/synthetic_probe_success.* 1/);
  });

  it('Should return return probe_success ok', async () => {
    const result = await request(app).get('/probe').query({ target: 'https://foo.foo' });

    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toMatch(/text/);
    expect(result.text).toMatch(/synthetic_probe_success.* 0/);
  });

  it('Should fail status ko', async () => {
    await bh.close();
    const result = await request(app)
      .get('/probe')
      .query({ target: 'https://github.com/pixelfactoryio/synthetic-exporter' });

    expect(result.status).toBe(500);
    expect(result.body.status).toBe(500);
    expect(result.body.message).toBe('playwright browser is disconnected');
    expect(result.headers['content-type']).toMatch(/json/);
  });
});
