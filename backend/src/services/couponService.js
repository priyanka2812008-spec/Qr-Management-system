import { db } from '../db/db.js';
import { qrSigner } from '../security/qrSigner.js';

/**
 * Coupon Service
 * Manages meal coupon generation upon check-in, validation of time-windows,
 * diet-awareness, and single-use redemption at food counters.
 */
export const couponService = {
  /**
   * Issues meal coupons for a newly checked-in participant
   */
  issueCouponsForParticipant(participant) {
    const data = db.data;
    const issued = [];

    // Ensure we don't issue duplicate coupons for the same participant
    const existing = data.coupons.filter(c => c.participantId === participant.id);
    if (existing.length > 0) {
      return existing;
    }

    data.meals.forEach((meal, idx) => {
      const codeSuffix = participant.ticketId.replace(/[^0-9]/g, '').slice(-4) || '0001';
      const couponCode = `FC-${codeSuffix}-${meal.day}-${idx + 1}`;
      const signedToken = qrSigner.generateCouponToken(couponCode, participant.id, meal.name);

      const coupon = {
        id: `cp-${couponCode}`,
        couponCode,
        qrToken: signedToken,
        participantId: participant.id,
        participantName: participant.name,
        diet: participant.diet,
        mealId: meal.id,
        mealName: meal.name,
        day: meal.day,
        window: `${meal.windowStart} - ${meal.windowEnd}`,
        status: meal.status === 'ACTIVE' ? 'VALID' : 'UPCOMING',
        redeemedAt: null,
        redeemedBy: null
      };

      data.coupons.push(coupon);
      issued.push(coupon);
    });

    db.save();
    return issued;
  },

  /**
   * Redeems a meal coupon at a food counter
   */
  redeemCoupon(couponTokenOrCode, counterName = 'Counter 1') {
    const data = db.data;

    // Search coupon by QR token or couponCode
    let coupon = data.coupons.find(
      c => c.qrToken === couponTokenOrCode || c.couponCode === couponTokenOrCode || c.id === couponTokenOrCode
    );

    // If not directly found, try extracting code
    if (!coupon && couponTokenOrCode.includes('_')) {
      const parts = couponTokenOrCode.split('_');
      const possibleCode = parts[2];
      coupon = data.coupons.find(c => c.couponCode === possibleCode);
    }

    if (!coupon) {
      return {
        success: false,
        error: 'COUPON_NOT_FOUND',
        message: 'Invalid or unknown coupon code'
      };
    }

    if (coupon.status === 'REDEEMED' || coupon.redeemedAt) {
      return {
        success: false,
        error: 'ALREADY_REDEEMED',
        message: `This coupon was already redeemed at ${new Date(coupon.redeemedAt).toLocaleTimeString()} (${coupon.redeemedBy || 'Counter'})`,
        coupon
      };
    }

    // Mark as redeemed
    coupon.status = 'REDEEMED';
    coupon.redeemedAt = new Date().toISOString();
    coupon.redeemedBy = counterName;

    // Calculate total served count for this meal
    const servedCount = data.coupons.filter(c => c.mealId === coupon.mealId && c.status === 'REDEEMED').length;
    const totalIssuedForMeal = data.coupons.filter(c => c.mealId === coupon.mealId).length;

    // Audit log
    data.auditLogs.unshift({
      id: `log-coupon-${Date.now()}`,
      action: 'COUPON_REDEEMED',
      participant: `${coupon.participantName}`,
      details: `${coupon.mealName} redeemed at ${counterName} (${coupon.diet})`,
      actor: counterName,
      timestamp: new Date().toISOString()
    });

    db.save();

    return {
      success: true,
      message: 'Coupon redeemed successfully',
      coupon,
      stats: {
        servedCount,
        totalIssued: totalIssuedForMeal
      }
    };
  }
};

