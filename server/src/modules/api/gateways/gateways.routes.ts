import express from 'express';

const gatewaysRouter = express.Router();

gatewaysRouter.get('/list', (req, res) => {
  res.send('list gateways post');
});

gatewaysRouter.patch('/edit/:id', (req, res) => {
  res.send('edit a specific gateway');
});

gatewaysRouter.post('/add', (req, res) => {
  res.send('add a new router to the list, should return a unique token that will be visible only temporarily for the client. This token will be inserted manually to the gateway config.');
});

gatewaysRouter.delete('/remove:routerId', (req, res) => {
  res.send('remove a router, effectively revoking its access to post data');
});


export default gatewaysRouter;