import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config/env.js';
import { checkinRouter } from './routes/checkin.js';
import { aiRouter } from './routes/ai.js';
import { couponsRouter } from './routes/coupons.js';
import { dashboardRouter } from './routes/dashboard.js';
import { seatingRouter } from './routes/seating.js';
import { participantsRouter } from './routes/participants.js';
import { emailRouter } from './routes/email.js';
import { securityRouter } from './routes/security.js';
import { jwtService } from './security/jwtService.js';
import { qrSigner } from './security/qrSigner.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO for real-time live synchronization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/checkin', checkinRouter);
app.use('/api/ai', aiRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/seating', seatingRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/email', emailRouter);
app.use('/api/security', securityRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const qrStatus = qrSigner.getStatus();
  const jwtStatus = jwtService.getStatus();
  res.json({
    status: 'ONLINE',
    platform: "Hacker's Unity QR Check-in & Smart Seating Platform",
    timestamp: new Date().toISOString(),
    security: {
      qrHmac: qrStatus.secretConfigured ? 'ACTIVE (HMAC-SHA256)' : 'WARNING: Using default secret',
      jwtAuth: jwtStatus.secretConfigured ? 'ACTIVE (HS256)' : 'WARNING: Using default secret',
    }
  });
});

// Socket connection
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const PORT = config.port || 5000;
server.listen(PORT, '0.0.0.0', () => {
  const qrStatus = qrSigner.getStatus();
  const jwtStatus = jwtService.getStatus();
  console.log(`====================================================`);
  console.log(` Hacker's Unity Check-in & Seating Backend Engine `);
  console.log(` Listening on: http://localhost:${PORT}              `);
  console.log(` Environment:  ${config.nodeEnv}                     `);
  console.log(`----------------------------------------------------`);
  console.log(` QR HMAC-SHA256 : ${qrStatus.secretConfigured ? '✓ ACTIVE  ' + qrStatus.secretPreview : '⚠ DEFAULT'}`);
  console.log(` JWT HS256      : ${jwtStatus.secretConfigured ? '✓ ACTIVE  ' + jwtStatus.secretPreview : '⚠ DEFAULT'}`);
  console.log(` Groq AI        : ${config.groqApiKey?.startsWith('gsk_') ? '✓ CONNECTED' : '⚠ NOT SET'}`);
  console.log(` Resend Email   : ${config.resendApiKey?.startsWith('re_') ? '✓ CONNECTED' : '⚠ NOT SET'}`);
  console.log(`====================================================`);
});
