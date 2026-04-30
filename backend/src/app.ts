import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import v1Routes from './routes/v1';
import { globalErrorHandler } from './utils/errorHandler';

const app = express();

// System Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Main API Router
app.use('/api/v1', v1Routes);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
