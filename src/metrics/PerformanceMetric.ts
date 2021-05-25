import { Gauge } from 'prom-client';

export class Metric<T extends Gauge<string>> {
  public metric: T;
  public performanceEntryType: string;
  public performanceEntryName: string;

  constructor(metric: T, entryType: 'navigation' | 'paint', entryName: keyof PerformanceTiming | keyof PerformanceEntry) {
    this.metric = metric;
    this.performanceEntryType = entryType;
    this.performanceEntryName = entryName;
  }

  public set(opts: { target: string }, value: number): void {
    return this.metric.set(opts, Math.floor(value) / 1000);
  }

  public reset(): void {
    return this.metric.reset();
  }
}
