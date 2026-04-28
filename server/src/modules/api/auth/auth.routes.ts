import express from 'express';

const authRouter = express.Router();

authRouter.post('/login', (req, res) => {
  res.send('login post');
});

authRouter.post('/logout', (req, res) => {
  res.send('logout post');
});

authRouter.post('/refresh', (req, res) => {
  res.send('Refreshes access token using valid refresh token.');
});

authRouter.get('/me', (req, res) => {
  res.send('Returns current authenticated user identity and role.');
});

authRouter.post('/register-from-invite', (req, res) => {
  res.send('Completes invite-based registration and creates user account.');
});


export default authRouter;