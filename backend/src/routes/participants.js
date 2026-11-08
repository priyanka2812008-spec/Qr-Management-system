import express from 'express';
import { db } from '../db/db.js';
import { qrSigner } from '../security/qrSigner.js';

export const participantsRouter = express.Router();

/**
 * GET /api/participants
 * Fetches all participants with optional query search
 */
participantsRouter.get('/', (req, res) => {
  const { query } = req.query;
  let list = db.data.participants;

  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.ticketId.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }

  return res.json({ participants: list });
});

/**
 * GET /api/participants/:id/ticket
 * Generates and fetches signed ticket view data for a participant
 */
participantsRouter.get('/:id/ticket', (req, res) => {
  const { id } = req.params;
  const participant = db.data.participants.find(p => p.id === id || p.ticketId === id);

  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  const team = db.data.teams.find(t => t.id === participant.teamId);
  const signedToken = qrSigner.generateTicketToken(participant.ticketId, participant.id);
  const coupons = db.data.coupons.filter(c => c.participantId === participant.id);

  return res.json({
    participant,
    team,
    qrToken: signedToken,
    coupons
  });
});

/**
 * POST /api/participants/reset
 * Resets database back to default seed for testing/demoing
 */
participantsRouter.post('/reset', (req, res) => {
  const freshData = db.reset();
  const io = req.app.get('io');
  if (io) {
    io.emit('db:reset');
  }
  return res.json({ success: true, message: 'Database reset to initial demo state' });
});

