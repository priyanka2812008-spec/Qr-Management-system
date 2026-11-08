import crypto from 'crypto';
import { config } from '../config/env.js';

/**
 * JWT Authentication & Session Token Service
 * Cryptographically signs and verifies JWT tokens using HMAC-SHA256 (HS256)
 * powered by config.jwtSecret
 */
export const jwtService = {
  /**
   * Signs a payload and returns an RFC 7519 compliant JSON Web Token (JWT)
   */
  sign(payload, expiresInSeconds = 86400) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const iat = Math.floor(Date.now() / 1000);
    const fullPayload = { ...payload, exp, iat };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  },

  /**
   * Verifies and decodes a JWT token against config.jwtSecret
   */
  verify(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is empty or invalid' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT format' };
    }

    const [headerB64, payloadB64, providedSig] = parts;

    // Calculate expected HMAC signature with jwtSecret
    const expectedSignature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (providedSig !== expectedSignature) {
      return { valid: false, error: 'Invalid JWT signature: Secret mismatch or tampered token' };
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'JWT token has expired' };
      }

      return { valid: true, payload };
    } catch (err) {
      return { valid: false, error: 'Failed to parse JWT payload' };
    }
  },

  /**
   * Issues coordinator or organizer session token
   */
  generateCoordinatorToken(name = 'Coordinator Desk #1', role = 'coordinator') {
    return this.sign({
      sub: name,
      role,
      desk: 'Desk-1',
      platform: "Hacker's Unity 2026"
    }, 86400 * 2); // 48 hours for hackathon duration
  },

  /**
   * Express middleware to protect sensitive coordinator/admin routes
   */
  authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid Bearer format' });
    }

    const token = authHeader.split(' ')[1];
    const verification = jwtService.verify(token);

    if (!verification.valid) {
      return res.status(403).json({ error: verification.error });
    }

    req.user = verification.payload;
    next();
  },

  /**
   * Returns security status
   */
  getStatus() {
    return {
      active: Boolean(config.jwtSecret),
      algorithm: 'HS256 (HMAC-SHA256)',
      secretConfigured: Boolean(config.jwtSecret && config.jwtSecret.length > 10),
      secretPreview: config.jwtSecret ? `${config.jwtSecret.slice(0, 8)}...${config.jwtSecret.slice(-6)}` : null
    };
  }
};

