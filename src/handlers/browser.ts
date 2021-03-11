import { Browser, chromium } from 'playwright-core';
import { backOff } from 'exponential-backoff';
import { Logger, createLogger } from 'winston';

type BrowserOption = (b: BrowserHandler) => void;

export default class BrowserHandler {
  public browser!: Browser;
  public isConnected: boolean;
  private wsEndpoint!: string;
  private logger: Logger;
  private maxConnectionRetry: number;

  constructor(...options: BrowserOption[]) {
    this.maxConnectionRetry = 100;
    this.logger = createLogger();

    for (const option of options) {
      option(this);
    }

    this.isConnected = false;
    this.runBrowserWithBackOff();
  }

  private runBrowserWithBackOff = (): void => {
    backOff(this.runBrowser, {
      retry: (e: any, attemptNumber: number): boolean => {
        this.logger.warn('broweser disconnected, trying to reconnect', { err: e, attemptNumber: attemptNumber });
        return attemptNumber > this.maxConnectionRetry;
      },
    });
  };

  public runBrowser = async (): Promise<void> => {
    const browser = await chromium.connect({ wsEndpoint: this.wsEndpoint });

    browser.on('disconnected', async () => {
      this.isConnected = false;
      this.runBrowserWithBackOff();
    });

    this.logger.info('browser connected');
    this.isConnected = true;
    this.browser = browser;
  };

  public static WithLogger(logger: Logger): BrowserOption {
    return (b: BrowserHandler): void => {
      b.logger = logger;
    };
  }

  public static WithWsEndpoint(wsEndpoint: string): BrowserOption {
    return (b: BrowserHandler): void => {
      b.wsEndpoint = wsEndpoint;
    };
  }

  public static WithMaxConnectionRetry(n: number): BrowserOption {
    return (b: BrowserHandler): void => {
      b.maxConnectionRetry = n;
    };
  }
}
