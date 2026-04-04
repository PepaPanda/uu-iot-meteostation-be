import express from 'express';

const notificationsRouter = express.Router();

notificationsRouter.get('/list', (req, res) => {
    res.send('list of notifications here');
});

notificationsRouter.post('/create', (req, res) => {
    res.json({responsibility: 'create notifications', bodyPosted: req.body});
});

notificationsRouter.patch('/acknowledge/:notificationId', (req, res) => {
    res.json({responsibility: 'acknowledge a single notification by id', idPosted: req.params.notificationId});
});


export default notificationsRouter;