import { Browser, chromium } from 'playwright-core';
import { backOff } from 'exponential-backoff';
import { Logger } from 'winston';

type BrowserOption = (b: BrowserHandler) => void;

export default class BrowserHandler {
  public browser!: Browser;
  public isConnected: boolean;
  private wsEndpoint!: string;
  private logger!: Logger;
  private maxConnectionRetry!: number;

  constructor(...options: BrowserOption[]) {
    for (const option of options) {
      option(this);
    }

    this.isConnected = false;
    this.initBrowser();
  }

  public initBrowser = async (): Promise<void> => {
    try {
      const browser = await backOff(() => chromium.connect({ wsEndpoint: this.wsEndpoint }), {
        numOfAttempts: this.maxConnectionRetry,
        retry: (e: any, attemptNumber: number): boolean => {
          this.logger.warn(`Error: ${e.message}`, {
            attemptNumber: attemptNumber,
            maxRetry: this.maxConnectionRetry,
          });
          return attemptNumber < this.maxConnectionRetry;
        },
      });

      browser.on('disconnected', async () => {
        this.isConnected = false;
        this.initBrowser();
      });

      this.logger.info(`browser connected to socket ${this.wsEndpoint}`);
      this.isConnected = true;
      this.browser = browser;
    } catch (e) {
      this.logger.error(`unable to connect browser to socket ${this.wsEndpoint}`, { err: e });
      process.exit(1);
    }
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
