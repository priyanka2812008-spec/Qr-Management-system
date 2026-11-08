import express from 'express';
import { db } from '../db/db.js';
import { qrSigner } from '../security/qrSigner.js';
import { seatEngine } from '../services/seatEngine.js';
import { couponService } from '../services/couponService.js';

export const checkinRouter = express.Router();

/**
 * POST /api/checkin/scan
 * Decodes & verifies QR ticket token, returns participant & team details
 */
checkinRouter.post('/scan', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      status: 'INVALID_TOKEN',
      error: 'Token parameter is required'
    });
  }

  const verification = qrSigner.verifyTicketToken(token);

  if (!verification.valid) {
    return res.status(400).json({
      status: 'INVALID_TOKEN',
      error: 'Tampered or unreadable QR code'
    });
  }

  // Find participant by ticketId or participantId
  const participant = db.data.participants.find(
    p => p.ticketId === verification.ticketId || p.id === token || p.ticketId === token
  );

  if (!participant) {
    return res.status(404).json({
      status: 'INVALID_TOKEN',
      error: `No participant record found for ticket: ${verification.ticketId || token}`
    });
  }

  const team = db.data.teams.find(t => t.id === participant.teamId) || {
    id: 'unknown',
    name: participant.teamName || 'Solo',
    size: 1,
    members_arrived: 0,
    slot_status: participant.slotStatus
  };

  // State 3: Already checked in
  if (participant.isCheckedIn) {
    return res.json({
      status: 'ALREADY_CHECKED_IN',
      participant,
      team,
      assignedSeat: participant.assignedSeat,
      checkedInAt: participant.checkedInAt,
      message: 'Participant already checked in. Do not admit again.'
    });
  }

  // State 2: Valid - Slot not confirmed
  if (participant.slotStatus !== 'CONFIRMED') {
    return res.json({
      status: 'VALID_PENDING',
      participant,
      team,
      message: 'Team found but slot is pending or waitlisted. Send to help desk.'
    });
  }

  // State 1: Valid - Slot confirmed
  return res.json({
    status: 'VALID_CONFIRMED',
    participant,
    team,
    message: 'Ticket verified. Tap "Confirm check-in" to assign seat and coupons.'
  });
});

/**
 * POST /api/checkin/confirm
 * Confirms check-in, assigns seat deterministically, and generates meal coupons
 */
checkinRouter.post('/confirm', (req, res) => {
  const { participantId, coordinatorName = 'Coordinator Desk #1', override = false } = req.body;

  if (!participantId) {
    return res.status(400).json({ error: 'participantId is required' });
  }

  const participant = db.data.participants.find(p => p.id === participantId || p.ticketId === participantId);

  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  if (participant.isCheckedIn) {
    return res.status(400).json({
      error: 'Participant already checked in',
      assignedSeat: participant.assignedSeat
    });
  }

  if (participant.slotStatus !== 'CONFIRMED' && !override) {
    return res.status(400).json({
      error: 'Cannot confirm check-in: Slot is not confirmed. Requires organizer override.'
    });
  }

  try {
    // 1. Assign deterministic seat via Seat Engine
    const assignedSeat = seatEngine.assignSeatForParticipant(participant);

    // 2. Mark participant as checked in
    participant.isCheckedIn = true;
    participant.checkedInAt = new Date().toISOString();

    // 3. Issue meal coupons
    const coupons = couponService.issueCouponsForParticipant(participant);

    // 4. Record audit log
    db.data.auditLogs.unshift({
      id: `log-checkin-${Date.now()}`,
      action: 'CHECKIN_CONFIRMED',
      participant: `${participant.name} (${participant.ticketId})`,
      team: participant.teamName,
      seat: assignedSeat.label,
      actor: coordinatorName,
      timestamp: new Date().toISOString()
    });

    db.save();

    // Broadcast real-time update via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.emit('checkin:updated', {
        participant,
        assignedSeat,
        coupons,
        stats: {
          checkedIn: db.data.participants.filter(p => p.isCheckedIn).length,
          pending: db.data.participants.filter(p => !p.isCheckedIn).length
        }
      });
    }

    return res.json({
      success: true,
      message: 'Check-in completed successfully',
      participant,
      assignedSeat,
      coupons
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

