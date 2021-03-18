import { createLogger, transports } from 'winston';

const logger = createLogger({
  level: 'debug',
  transports: [new transports.Console({ silent: true })],
});

const listenSpy = jest.fn().mockImplementation((port: number, callback?: () => void): void => {
  if (callback) {
    callback();
  }
});

jest.doMock('express', () => {
  return () => ({
    listen: listenSpy,
  });
});

import App from './App';

let app: App;
beforeAll(() => {
  app = new App({ logger: logger });
});

describe('App', () => {
  it('Should create an App with default values)', () => {
    expect(app).toBeInstanceOf(App);
    expect(app.PORT).toBe(8090);
    expect(app.logger).toEqual(logger);
  });

  it('Should call listen', () => {
    app.listen();
    expect(listenSpy).toHaveBeenCalled();
  });
});
