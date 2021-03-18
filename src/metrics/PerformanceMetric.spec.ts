import { Registry, Gauge } from 'prom-client';

import { PerformanceMetric } from './PerformanceMetric';

let registry: Registry;
let pm: PerformanceMetric<Gauge<string>>;

beforeAll(() => {
  registry = new Registry();

  pm = new PerformanceMetric(
    new Gauge({
      name: 'test_probe_seconds',
      help: 'Test probe for testing.',
      labelNames: ['target'],
    }),
    'duration',
  );

  registry.registerMetric(pm.metric);

  pm.set({ target: 'foo' }, 1);
});

afterAll(() => {
  registry.clear();
});

describe('PerformanceMetric', () => {
  it('Should create a gauge and add value', async () => {
    pm.set({ target: 'foo' }, 10);

    const metrics = await registry.metrics();
    const output =
      '# HELP test_probe_seconds Test probe for testing.\n# TYPE test_probe_seconds gauge\ntest_probe_seconds{target="foo"} 0.01\n';

    expect(pm).toBeInstanceOf(PerformanceMetric);
    expect(pm.metric).toBeInstanceOf(Gauge);
    expect(pm.metric).toEqual(registry.getSingleMetric('test_probe_seconds'));
    expect(metrics).toEqual(output);
  });

  it('Should create a gauge and reset its value', async () => {
    pm.reset();

    const metrics = await registry.metrics();
    const output = '# HELP test_probe_seconds Test probe for testing.\n# TYPE test_probe_seconds gauge\n';

    expect(pm).toBeInstanceOf(PerformanceMetric);
    expect(pm.metric).toBeInstanceOf(Gauge);
    expect(pm.metric).toEqual(registry.getSingleMetric('test_probe_seconds'));
    expect(metrics).toEqual(output);
  });
});
