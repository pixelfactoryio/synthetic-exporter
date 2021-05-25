import { Router, Request, Response, NextFunction } from 'express';
import { Registry, Gauge } from 'prom-client';
import { Logger } from 'winston';

import ValidateDto from '../middlewares/ValidateDto';
import HttpException from '../exceptions/HttpException';
import { Controller, SyntheticMetric } from '../types';
import { ProbeQuery, ProbeQuerySchema } from '../dto/probe';
import { Metric } from '../metrics/PerformanceMetric';
import BrowserHandler from '../handlers/browser';

type ProbeOption = (p: Probe) => void;

function observeMetrics() {
  window.firstContentfulPaint = 0;
  window.largestContentfulPaint = 0;
  window.timeToInteractive = 0;

  const LCPObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      window.largestContentfulPaint = lastEntry;
  });
  LCPObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  const FCPObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntriesByName('first-contentful-paint');
      const lastEntry = entries[entries.length - 1];
      window.firstContentfulPaint = lastEntry;
  });
  FCPObserver.observe({ type: 'paint', buffered: true });

  const TTIObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      window.timeToInteractive = lastEntry; 
  });
  TTIObserver.observe({ type: 'navigation', buffered: true });

  document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
          LCPObserver.takeRecords();
          LCPObserver.disconnect();
          FCPObserver.takeRecords();
          FCPObserver.disconnect();
          TTIObserver.takeRecords();
          TTIObserver.disconnect();
      }
  });
}

class Probe implements Controller {
  public path = '/probe';
  public router = Router();
  private logger!: Logger;
  private browserHandler!: BrowserHandler;

  /** Prometheus metrics an registry */
  private registry = new Registry();
  private probeSuccessMetric = new Gauge({
    name: 'synthetic_probe_success',
    help: 'Displays whether or not the probe was a success',
    labelNames: ['target'],
  });
  private Metrics!: SyntheticMetric<{ target: string }>[];

  constructor(...options: ProbeOption[]) {
    for (const option of options) {
      option(this);
    }

    this.routes();
    this.initPrometheus();
  }

  private routes(): void {
    this.router.get(this.path, ValidateDto(ProbeQuerySchema), this.index);
  }

  private initPrometheus(): void {
    this.registry.registerMetric(this.probeSuccessMetric);

    this.Metrics = this.setupMetrics();
    for (const m of this.Metrics) {
      this.registry.registerMetric(m.metric);
    }
  }

  public static WithLogger(logger: Logger): ProbeOption {
    return (p: Probe): void => {
      p.logger = logger;
    };
  }

  public static WithBrowserHandler(bh: BrowserHandler): ProbeOption {
    return (p: Probe): void => {
      p.browserHandler = bh;
    };
  }

  private setupMetrics(): SyntheticMetric<{ target: string }>[] {
    return [
      new Metric(
        new Gauge({
          name: 'synthetic_probe_duration_seconds',
          help: 'Represents how long, in seconds, it took for the probe complete.',
          labelNames: ['target'],
        }),
        'navigation',
        'duration',
      ),
      new Metric(
        new Gauge({
          name: 'synthetic_probe_dom_complete_duration_seconds',
          help: "Represents how long, in seconds, it took for the DOM to changes to 'complete' state.",
          labelNames: ['target'],
        }),
        'navigation',
        'domComplete',
      ),
      new Metric(
        new Gauge({
          name: 'synthetic_probe_dom_interactive_duration_seconds',
          help: "Represents how long, in seconds, it took for the DOM to changes to 'interactive' state.",
          labelNames: ['target'],
        }),
        'navigation',
        'domInteractive',
      ),
    ];
  }

  private index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { target } = req.query as ProbeQuery;

    if (!this.browserHandler.isConnected()) {
      this.registry.resetMetrics();
      next(new HttpException(500, 'playwright browser is disconnected'));
      return;
    }

    res.set('Content-Type', this.registry.contentType);

    try {
      const context = await this.browserHandler.browser.newContext();
      const page = await context.newPage();
      const navigationPromise = page.waitForNavigation();
      
      await page.addInitScript(observeMetrics);
      await page.goto(target);
      await navigationPromise;

      const perfmap: Array<any> = JSON.parse(
        await page.evaluate<string>(`
          JSON.stringify(
            { 
              firstContentfulPaint: window.firstContentfulPaint,
              largestContentfulPaint: window.largestContentfulPaint,
              timeToInteractive: window.timeToInteractive
            }
          )
        `)
      );

      this.logger.debug(`${target} performance`, { perfmap });
      console.log(perfmap)

      // const navigationPerfMap = perfmap.filter(m => m.entryType === 'navigation')
      // console.log("------------------")
      // console.log(navigationPerfMap)
      // console.log("------------------")
      // for (const metric of this.Metrics) {
      //   metric.set({ target: target }, );
      // }

      // const paintPerfMap = perfmap.filter(m => m.entryType === 'paint')
      // console.log("------------------")
      // console.log(paintPerfMap)
      // console.log("------------------")

      this.probeSuccessMetric.set({ target: target }, 1);

      await page.close();
      await context.close();
    } catch (e) {
      this.registry.resetMetrics();
      this.probeSuccessMetric.set({ target: target }, 0);
      this.logger.error('unable to run probe', { err: e });
    }

    res.send(await this.registry.metrics());
    this.registry.resetMetrics();
  };
}

export default Probe;
