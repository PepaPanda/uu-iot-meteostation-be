import express from 'express';

const dataRouter = express.Router();

dataRouter.post('/send', (req, res) => {
    res.json({responsibility: 'collect data from gw and save it. Send SSE to all opened frontends', body: req.body, headers: req.headers});
});


export default dataRouter;