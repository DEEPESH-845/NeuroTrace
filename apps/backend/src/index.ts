import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/authMiddleware';
import assessmentRoutes from './routes/assessmentRoutes';
import alertRoutes from './routes/alertRoutes';
import patientRoutes from './routes/patientRoutes';
import fhirRoutes from './routes/fhirRoutes';
import federatedRoutes from './routes/federatedRoutes';
import adminRoutes from './routes/adminRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json({ limit: '10mb' })); // JSON body parser with size limit

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth middleware for all API routes
app.use('/api/v1', authMiddleware);

// API routes
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/federated', federatedRoutes);
app.use('/api/v1/admin', adminRoutes);

// FHIR routes (also authenticated)
app.use('/fhir', authMiddleware, fhirRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    },
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`NeuroTrace Backend API listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
