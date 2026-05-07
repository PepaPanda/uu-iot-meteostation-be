import express from 'express';
import { apiRouter, collectRouter } from './routes';

import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import env from './env';
import { globalErrorHandler, invalidSyntaxErrorHandler } from './middleware/errorHandlers';

import cookieParser from 'cookie-parser';

// env.PORT is for railway
const PORT = env.APP_STAGE === 'production' ? env.PORT : env.EXPRESS_PORT;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  env.FRONTEND_URL
];

export default () => {
    const app = express();

    // Security headers
    app.use(helmet());

    // CORS
    app.use(cors({
        origin(origin, callback) {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
            }
            callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true
    }));

    // Request logging
    app.use(morgan('dev'));

    // Parse incoming req bodies
    app.use(express.json());
    app.use(invalidSyntaxErrorHandler); // Keep so invalid json doesnt end on 500

    //Cookkies
    app.use(cookieParser());

    //Routers
    app.use('/api', apiRouter);
    app.use('/collect', collectRouter);

    app.use(globalErrorHandler);

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${env.EXPRESS_PORT}`);
        console.log(`APP_ENV: ${env.APP_STAGE}`);
    });
};
