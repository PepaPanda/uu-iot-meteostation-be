import express from 'express';

const usersRouter = express.Router();

usersRouter.patch('/update', (req, res) => {
    res.json({responsibility: 'update current user profile', body: req.body});
});

usersRouter.patch('/change-password', (req, res) => {
    res.json({responsibility: 'change user password', body: req.body});
});

usersRouter.delete('/:userId', (req, res) => {
    res.json({responsibility: 'delete user', body: req.body});
});

usersRouter.post('/invite',  (req, res) => {
    res.json({responsibility: 'this will return an invitation link for any user. Target e-mail is required in body', body: req.body});
});

usersRouter.get('/',  (req, res) => {
    res.json({responsibility: 'Returns users for administration.', body: req.body});
});

usersRouter.get('/:userId',  (req, res) => {
    res.json({responsibility: 'Returns one user by ID.', body: req.body});
});

usersRouter.patch('/:userId/role',  (req, res) => {
    res.json({responsibility: 'Changes application role/profile of an existing user.', body: req.body});
});


export default usersRouter;