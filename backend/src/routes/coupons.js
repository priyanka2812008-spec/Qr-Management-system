import express from 'express';
import { couponService } from '../services/couponService.js';
import { db } from '../db/db.js';

export const couponsRouter = express.Router();

/**
 * POST /api/coupons/redeem
 * Food counter scanner scans coupon QR and marks as redeemed (one-time use)
 */
couponsRouter.post('/redeem', (req, res) => {
  const { couponToken, counterName = 'Counter 2' } = req.body;

  if (!couponToken) {
    return res.status(400).json({
      success: false,
      error: 'COUPON_TOKEN_REQUIRED',
      message: 'Coupon token or code is required'
    });
  }

  const result = couponService.redeemCoupon(couponToken, counterName);

  if (!result.success) {
    return res.status(400).json(result);
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('coupon:redeemed', result);
  }

  return res.json(result);
});

/**
 * GET /api/coupons/participant/:id
 * Fetches all meal coupons for a participant
 */
couponsRouter.get('/participant/:id', (req, res) => {
  const { id } = req.params;
  const participant = db.data.participants.find(p => p.id === id || p.ticketId === id);

  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  const coupons = db.data.coupons.filter(c => c.participantId === participant.id);
  return res.json({ coupons });
});

/**
 * GET /api/coupons/stats
 * Overview of coupon distribution and meal redemptions
 */
couponsRouter.get('/stats', (req, res) => {
  const mealsStats = db.data.meals.map(meal => {
    const totalIssued = db.data.coupons.filter(c => c.mealId === meal.id).length;
    const redeemed = db.data.coupons.filter(c => c.mealId === meal.id && c.status === 'REDEEMED').length;
    return {
      mealId: meal.id,
      name: meal.name,
      day: meal.day,
      window: `${meal.windowStart} - ${meal.windowEnd}`,
      status: meal.status,
      totalIssued,
      redeemed,
      pending: totalIssued - redeemed
    };
  });

  return res.json({ meals: mealsStats });
});

