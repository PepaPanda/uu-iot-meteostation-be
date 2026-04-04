import express from 'express';

const apiRouter = express.Router();

apiRouter.get('/meteostation', (req, res) => {
  res.send('response');
});

export default apiRouter;
