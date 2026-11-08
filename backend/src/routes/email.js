import express from 'express';
import { resendEmailService } from '../services/resendEmailService.js';
import { db } from '../db/db.js';
import { qrSigner } from '../security/qrSigner.js';

export const emailRouter = express.Router();

/**
 * GET /api/email/status
 * Returns Resend connection status
 */
emailRouter.get('/status', (req, res) => {
  const status = resendEmailService.getStatus();
  return res.json({
    success: true,
    ...status
  });
});

/**
 * POST /api/email/send-ticket
 * Sends digital entry ticket to attendee email
 */
emailRouter.post('/send-ticket', async (req, res) => {
  try {
    const { participantId, email } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }

    const participant = db.data.participants.find(
      p => p.id === participantId || p.ticketId === participantId
    );

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const qrToken = qrSigner.generateTicketToken(participant.ticketId, participant.id);
    const coupons = db.data.coupons.filter(c => c.participantId === participant.id);

    const result = await resendEmailService.sendTicketEmail({
      to: email || participant.email,
      participant,
      qrToken,
      coupons
    });

    if (result.success) {
      // Record audit log
      db.data.auditLogs.unshift({
        id: `log-email-${Date.now()}`,
        action: 'TICKET_EMAILED',
        participant: `${participant.name} (${participant.ticketId})`,
        email: email || participant.email,
        resendId: result.id,
        actor: 'System / Coordinator',
        timestamp: new Date().toISOString()
      });
      db.save();

      return res.json({
        success: true,
        message: `Ticket sent successfully to ${email || participant.email}`,
        resendId: result.id
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        statusCode: result.statusCode
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/email/send-receipt
 * Sends check-in receipt to attendee email
 */
emailRouter.post('/send-receipt', async (req, res) => {
  try {
    const { participantId, email } = req.body;

    const participant = db.data.participants.find(
      p => p.id === participantId || p.ticketId === participantId
    );

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const coupons = db.data.coupons.filter(c => c.participantId === participant.id);

    const result = await resendEmailService.sendCheckinReceiptEmail({
      to: email || participant.email,
      participant,
      assignedSeat: { label: participant.assignedSeat },
      coupons
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

