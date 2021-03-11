import { Router, Request, Response } from 'express';
import { Controller } from '../types';

class Home implements Controller {
  public path = '/';
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes(): void {
    this.router.get(this.path, this.index);
  }

  private index(req: Request, res: Response) {
    res.status(200).send({ status: 'ok' });
  }
}

export default Home;
