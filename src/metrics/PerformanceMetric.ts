import { Gauge } from 'prom-client';
import { PerformanceProperty } from '../types';

export class PerformanceMetric<T extends Gauge<string>> {
  public metric: T;
  public performancePropertyName: PerformanceProperty;

  constructor(metric: T, performancePropertyName: PerformanceProperty) {
    this.metric = metric;
    this.performancePropertyName = performancePropertyName;
  }

  public set(opts: { target: string }, value: number): void {
    return this.metric.set(opts, Math.floor(value) / 1000);
  }

  public reset(): void {
    return this.metric.reset();
  }
}
