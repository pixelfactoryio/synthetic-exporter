import { Router } from 'express';
import { Metric } from 'prom-client';

export interface Controller {
  path: string;
  router: Router;
}

export type PerformanceProperty = keyof PerformanceTiming | keyof PerformanceEntry;

export interface SyntheticMetric<T> {
  performancePropertyName: PerformanceProperty;
  metric: Metric<string>;
  set(ops: T, value: number): void;
  reset(): void;
}
