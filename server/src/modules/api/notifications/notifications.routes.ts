import express from 'express';

const notificationsRouter = express.Router();

notificationsRouter.get('/', (req, res) => {
    res.send('Returns notifications visible to current user, including acknowledgement state.');
});

notificationsRouter.post('/', (req, res) => {
    res.json({responsibility: 'Creates manual notification, mainly for admins', bodyPosted: req.body});
});

notificationsRouter.post('/:notificationId/acknowledge', (req, res) => {
    res.json({responsibility: 'acknowledge a single notification by id', idPosted: req.params.notificationId});
});


export default notificationsRouter;