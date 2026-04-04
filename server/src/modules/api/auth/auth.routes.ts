import express from 'express';

const authRouter = express.Router();

authRouter.post('/login', (req, res) => {
  res.send('login post');
});

authRouter.post('/register', (req, res) => {
  res.send('register post');
});

authRouter.post('/logout', (req, res) => {
  res.send('logout post');
});


export default authRouter;