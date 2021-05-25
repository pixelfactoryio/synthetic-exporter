import { Router } from 'express';
import { Metric } from 'prom-client';

export interface Controller {
  path: string;
  router: Router;
}

export interface SyntheticMetric<T> {
  metric: Metric<string>;
  performanceEntryType: string;
  performanceEntryName: string;
  set(ops: T, value: number): void;
  reset(): void;
}

declare global {
  interface Window {
    largestContentfulPaint: any; 
    firstContentfulPaint: any;
    timeToInteractive: any;
  }
}