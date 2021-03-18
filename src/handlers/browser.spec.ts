import { chromium, BrowserServer } from 'playwright';
import BrowserHandler from './browser';

let bs: BrowserServer;
let wsEndpoint: string;
beforeAll(async () => {
  bs = await chromium.launchServer();
  wsEndpoint = bs.wsEndpoint();
});

afterAll(async () => {
  await bs.close();
});

describe('BrowserHandler', () => {
  it('Should connect', async () => {
    const bh = await BrowserHandler.Build(
      BrowserHandler.WithWsEndpoint(wsEndpoint),
      BrowserHandler.WithMaxConnectionRetry(Number(2)),
    );

    expect(bh).toBeInstanceOf(BrowserHandler);
    expect(bh.isConnected()).toBe(true);
    expect(bh.maxConnectionRetry).toBe(2);

    await bh.close();
  });

  it('Should not connect and throw an error', async () => {
    await expect(
      BrowserHandler.Build(
        BrowserHandler.WithWsEndpoint('ws://i_will_fail_host:5000'),
        BrowserHandler.WithMaxConnectionRetry(Number(0)),
      ),
    ).rejects.toThrow();
  });

  it('Should retry to connect and emit an error', async (done) => {
    const bh = await BrowserHandler.Build(
      BrowserHandler.WithWsEndpoint(wsEndpoint),
      BrowserHandler.WithMaxConnectionRetry(Number(2)),
    );

    bh.on('error', async () => {
      expect(bh.isConnected()).toBe(false);
      expect(bh.attemptNumber).toBe(2);
      await bh.close();
      done();
    });

    await bs.close();
  });
});
