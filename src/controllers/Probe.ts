import { Router, Request, Response, NextFunction } from 'express';
import { Registry, Gauge } from 'prom-client';
import { Logger } from 'winston';

import ValidateDto from '../middlewares/ValidateDto';
import HttpException from '../exceptions/HttpException';
import { Controller, SyntheticMetric } from '../types';
import { ProbeQuery, ProbeQuerySchema } from '../dto/probe';
import { PerformanceMetric } from '../metrics/PerformanceMetric';
import BrowserHandler from '../handlers/browser';

type ProbeOption = (p: Probe) => void;

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
  private performanceMetrics!: SyntheticMetric<{ target: string }>[];

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

    this.performanceMetrics = this.setupPerformaceMetrics();
    for (const m of this.performanceMetrics) {
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

  private setupPerformaceMetrics(): SyntheticMetric<{ target: string }>[] {
    return [
      new PerformanceMetric(
        new Gauge({
          name: 'synthetic_probe_duration_seconds',
          help: 'Represents how long, in seconds, it took for the probe complete.',
          labelNames: ['target'],
        }),
        'duration',
      ),
      new PerformanceMetric(
        new Gauge({
          name: 'synthetic_probe_dom_complete_duration_seconds',
          help: "Represents how long, in seconds, it took for the DOM to changes to 'complete' state.",
          labelNames: ['target'],
        }),
        'domComplete',
      ),
      new PerformanceMetric(
        new Gauge({
          name: 'synthetic_probe_dom_interactive_duration_seconds',
          help: "Represents how long, in seconds, it took for the DOM to changes to 'interactive' state.",
          labelNames: ['target'],
        }),
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
      await page.goto(target);

      const perfmap = await page.evaluate<string>(`JSON.stringify(performance.getEntriesByType('navigation'))`);
      const navigationPerformance = JSON.parse(perfmap)[0];
      this.logger.debug(`${target} performance`, { navigationPerformance });

      for (const metric of this.performanceMetrics) {
        metric.set({ target: target }, navigationPerformance[metric.performancePropertyName]);
      }
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
