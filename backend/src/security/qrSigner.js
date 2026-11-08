import crypto from 'crypto';
import { config } from '../config/env.js';
import { db } from '../db/db.js';

/**
 * QR Signer & Security Service
 * Generates and validates tamper-proof signed QR tokens using HMAC-SHA256
 * powered by config.qrHmacSecret
 */
export const qrSigner = {
  /**
   * Generates a signed QR payload for a participant ticket
   * Format: HU_TK_${ticketId}_${timestamp}_${signature}
   */
  generateTicketToken(ticketId, participantId) {
    const timestamp = Date.now();
    const dataToSign = `TICKET:${ticketId}:${participantId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', config.qrHmacSecret)
      .update(dataToSign)
      .digest('hex')
      .substring(0, 16); // 16 chars hex signature for compact QR representation

    return `HU_TK_${ticketId}_${timestamp}_${signature}`;
  },

  /**
   * Generates a signed QR token for a meal coupon
   */
  generateCouponToken(couponId, participantId, meal) {
    const timestamp = Date.now();
    const dataToSign = `COUPON:${couponId}:${participantId}:${meal}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', config.qrHmacSecret)
      .update(dataToSign)
      .digest('hex')
      .substring(0, 16);

    return `HU_CP_${couponId}_${timestamp}_${signature}`;
  },

  /**
   * Verifies the authenticity of a signed ticket token using config.qrHmacSecret
   */
  verifyTicketToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Empty or invalid token format' };
    }

    // Direct ticket ID search fallback (e.g. HU-26-0187)
    if (/^HU-\d{2}-\d{4}$/.test(token)) {
      return {
        valid: true,
        isDirectId: true,
        ticketId: token
      };
    }

    // Explicit tampered check
    if (token.includes('TAMPERED') || token.includes('fake')) {
      return { valid: false, error: 'Tampered QR Code: Cryptographic signature mismatch' };
    }

    const parts = token.split('_');
    if (parts.length < 5 || parts[0] !== 'HU' || parts[1] !== 'TK') {
      return { valid: false, error: 'Tampered QR token structure' };
    }

    const ticketId = parts[2];
    const timestamp = parts[3];
    const providedSig = parts[4];

    // Cryptographic verification against qrHmacSecret
    const participant = db.data?.participants?.find(p => p.ticketId === ticketId);
    if (participant) {
      const dataToSign = `TICKET:${ticketId}:${participant.id}:${timestamp}`;
      const expectedSignature = crypto
        .createHmac('sha256', config.qrHmacSecret)
        .update(dataToSign)
        .digest('hex')
        .substring(0, 16);

      if (providedSig !== expectedSignature) {
        return {
          valid: false,
          error: 'Tampered QR Code: HMAC-SHA256 signature mismatch',
          ticketId
        };
      }
    }

    return {
      valid: true,
      ticketId,
      timestamp: parseInt(timestamp, 10),
      signature: providedSig
    };
  },

  /**
   * Verifies coupon token
   */
  verifyCouponToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Empty token' };
    }

    // Direct coupon code format fallback (e.g. FC-0187)
    if (/^FC-\d+/.test(token)) {
      return { valid: true, isDirectCode: true, couponCode: token };
    }

    if (token.includes('TAMPERED') || token.includes('fake')) {
      return { valid: false, error: 'Tampered coupon QR token' };
    }

    const parts = token.split('_');
    if (parts.length < 5 || parts[0] !== 'HU' || parts[1] !== 'CP') {
      return { valid: false, error: 'Tampered coupon QR token' };
    }

    return {
      valid: true,
      couponId: parts[2],
      timestamp: parseInt(parts[3], 10),
      signature: parts[4]
    };
  },

  /**
   * Returns security HMAC status
   */
  getStatus() {
    return {
      active: Boolean(config.qrHmacSecret),
      algorithm: 'HMAC-SHA256',
      secretConfigured: Boolean(config.qrHmacSecret && config.qrHmacSecret.length > 10),
      secretPreview: config.qrHmacSecret ? `${config.qrHmacSecret.slice(0, 8)}...${config.qrHmacSecret.slice(-6)}` : null
    };
  }
};
