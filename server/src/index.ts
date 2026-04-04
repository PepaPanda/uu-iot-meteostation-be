import express from 'express';
import apiRouter from './routes/api.routes';

import env from './env';

const app = express();

app.use(express.json());

app.use('/api', apiRouter);

app.listen(env.EXPRESS_PORT, () => {
  console.log(`Server running on http://localhost:${env.EXPRESS_PORT}`);
  console.log(`APP_ENV: ${env.APP_STAGE}`);
});
