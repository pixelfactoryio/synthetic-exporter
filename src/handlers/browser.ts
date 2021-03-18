import { Browser, chromium } from 'playwright-core';
import { backOff } from 'exponential-backoff';
import EventEmitter from 'events';

type BrowserOption = (b: BrowserHandler) => void;

export default class BrowserHandler extends EventEmitter {
  public browser!: Browser;
  private wsEndpoint!: string;
  public maxConnectionRetry!: number;
  public attemptNumber!: number;
  private isClosing: boolean;

  constructor(...options: BrowserOption[]) {
    super();
    for (const option of options) {
      option(this);
    }
    this.attemptNumber = 0;
    this.isClosing = false;
  }

  public static async Build(...options: BrowserOption[]): Promise<BrowserHandler> {
    const bh = new BrowserHandler(...options);
    await bh.initBrowser();
    return bh;
  }

  public isConnected = (): boolean => {
    return this.browser.isConnected();
  };

  public close = async (): Promise<void> => {
    this.isClosing = true;
    this.removeAllListeners();
    return this.browser.close();
  };

  public initBrowser = async (): Promise<void> => {
    try {
      this.browser = await backOff(() => chromium.connect({ wsEndpoint: this.wsEndpoint }), {
        numOfAttempts: this.maxConnectionRetry,
        retry: (e: any, attemptNumber: number): boolean => {
          this.emit('connection_retry', e, attemptNumber);
          this.attemptNumber++;
          return this.attemptNumber < this.maxConnectionRetry;
        },
      });

      this.browser.on('disconnected', async () => {
        if (!this.isClosing) {
          await this.initBrowser();
        }
      });
    } catch (e) {
      this.emit('error', e);
    }
  };

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
