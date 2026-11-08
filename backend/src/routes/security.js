import express from 'express';
import { qrSigner } from '../security/qrSigner.js';
import { jwtService } from '../security/jwtService.js';
import { config } from '../config/env.js';
import { groqPlanner } from '../services/groqPlanner.js';
import { resendEmailService } from '../services/resendEmailService.js';

export const securityRouter = express.Router();

/**
 * GET /api/security/status
 * Returns full status of QR HMAC, JWT, Groq and Resend
 */
securityRouter.get('/status', async (req, res) => {
  const qrStatus = qrSigner.getStatus();
  const jwtStatus = jwtService.getStatus();
  const groqStatus = await groqPlanner.getStatus();
  const emailStatus = resendEmailService.getStatus();

  return res.json({
    success: true,
    qrSigning: {
      ...qrStatus,
      description: 'HMAC-SHA256 for tamper-proof QR tickets & food coupons'
    },
    jwtAuth: {
      ...jwtStatus,
      description: 'HS256 JWT for coordinator/organizer session tokens'
    },
    groqAi: {
      connected: groqStatus.connected,
      model: groqStatus.model,
      keyPreview: groqStatus.keyPreview,
      description: 'Groq Cloud LLM for AI seating plan generation'
    },
    email: {
      configured: emailStatus.configured,
      sender: emailStatus.sender,
      keyPreview: emailStatus.keyPreview,
      description: 'Resend API for digital ticket & check-in email delivery'
    }
  });
});

/**
 * POST /api/security/token/generate
 * Generates a coordinator JWT session token
 */
securityRouter.post('/token/generate', (req, res) => {
  const { name = 'Coordinator Desk #1', role = 'coordinator' } = req.body;
  const token = jwtService.generateCoordinatorToken(name, role);
  const verification = jwtService.verify(token);

  return res.json({
    success: true,
    token,
    payload: verification.payload,
    expiresAt: new Date(verification.payload.exp * 1000).toISOString()
  });
});

/**
 * POST /api/security/token/verify
 * Verifies a JWT token
 */
securityRouter.post('/token/verify', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const result = jwtService.verify(token);
  return res.json({
    success: result.valid,
    ...result
  });
});

/**
 * POST /api/security/qr/verify
 * Verifies a QR ticket or coupon token signature
 */
securityRouter.post('/qr/verify', (req, res) => {
  const { token, type = 'ticket' } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const result = type === 'coupon'
    ? qrSigner.verifyCouponToken(token)
    : qrSigner.verifyTicketToken(token);

  return res.json({
    success: result.valid,
    type,
    algorithm: 'HMAC-SHA256',
    ...result
  });
});
