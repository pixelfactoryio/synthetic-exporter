import request from 'supertest';
import App from '../App';
import Home from './Home';

describe('Home', () => {
  it('Should return status ok', async () => {
    const app = new App({ controllers: [new Home()] }).getServer();
    const result = await request(app).get('/');

    expect(result.status).toBe(200);
    expect(result.body.status).toBe('ok');
    expect(result.headers['content-type']).toMatch(/json/);
  });
});
