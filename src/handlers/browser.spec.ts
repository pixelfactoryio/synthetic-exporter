import { chromium } from 'playwright';
import BrowserHandler from './browser';

describe('BrowserHandler', () => {
  it('Should connect', async () => {
    const bs = await chromium.launchServer();
    const wsEndpoint = bs.wsEndpoint();

    const bh = await BrowserHandler.Build(
      BrowserHandler.WithWsEndpoint(wsEndpoint),
      BrowserHandler.WithMaxConnectionRetry(Number(2)),
    );

    expect(bh).toBeInstanceOf(BrowserHandler);
    expect(bh.isConnected()).toBe(true);
    expect(bh.maxConnectionRetry).toBe(2);

    await bh.close();
    await bs.kill();
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
    const bs = await chromium.launchServer();
    const wsEndpoint = bs.wsEndpoint();

    const bh = await BrowserHandler.Build(
      BrowserHandler.WithWsEndpoint(wsEndpoint),
      BrowserHandler.WithMaxConnectionRetry(Number(3)),
    );

    bh.on('error', async () => {
      expect(bh.isConnected()).toBe(false);
      expect(bh.attemptNumber).toBe(3);
      await bh.close();
      done();
    });

    await bs.kill();
  });
});
