import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json()); // JSON body parser

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes (to be implemented)
app.use('/api/v1/assessments', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

app.use('/api/v1/alerts', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

app.use('/api/v1/patients', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

app.use('/fhir', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
