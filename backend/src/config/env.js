import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env first
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Then load backend/.env (allowing override of local settings)
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  qrHmacSecret: process.env.QR_HMAC_SECRET || 'hackers_unity_super_secret_hmac_key_2026_xyz',
  jwtSecret: process.env.JWT_SECRET || 'hackers_unity_jwt_secret_token_auth_998877',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || "Hacker's Unity <onboarding@resend.dev>",
  googleSheetId: process.env.GOOGLE_SHEET_ID || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
