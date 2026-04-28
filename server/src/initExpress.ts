import express from 'express';
import { apiRouter, collectRouter } from './routes';

import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import env from './env';
import { globalErrorHandler, invalidSyntaxErrorHandler } from './middleware/errorHandlers';

export default () => {
    const app = express();

    // Security headers
    app.use(helmet());

    // CORS
    app.use(cors());

    // Request logging
    app.use(morgan('dev'));

    // Parse incoming req bodies
    app.use(express.json());
    app.use(invalidSyntaxErrorHandler); // Keep so invalid json doesnt end on 500

    //Routers
    app.use('/api', apiRouter);
    app.use('/collect', collectRouter);

    app.use(globalErrorHandler);

    app.listen(env.EXPRESS_PORT, () => {
    console.log(`Server running on http://localhost:${env.EXPRESS_PORT}`);
    console.log(`APP_ENV: ${env.APP_STAGE}`);
    });
};
