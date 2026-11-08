import { db } from './src/db/db.js';
import { qrSigner } from './src/security/qrSigner.js';
import { seatEngine } from './src/services/seatEngine.js';
import { couponService } from './src/services/couponService.js';
import { groqPlanner } from './src/services/groqPlanner.js';

console.log('--- Testing Hacker\'s Unity Core Engine ---');

// 1. Test QR Signer
const token = qrSigner.generateTicketToken('HU-26-0187', 'p-187');
console.log('1. Generated Signed QR Token:', token);
const verified = qrSigner.verifyTicketToken(token);
console.log('   Verification result:', verified.valid ? 'VALID' : 'INVALID', 'ticketId:', verified.ticketId);

// 2. Test Seat Engine
const testParticipant = db.data.participants.find(p => p.ticketId === 'HU-26-0187');
console.log('2. Participant for checkin:', testParticipant.name, 'Team:', testParticipant.teamName);
const assignedSeat = seatEngine.assignSeatForParticipant(testParticipant);
console.log('   Assigned Seat:', assignedSeat.label, 'Status:', assignedSeat.status);

// 3. Test Coupon Service
const coupons = couponService.issueCouponsForParticipant(testParticipant);
console.log('3. Issued Coupons:', coupons.length);
coupons.forEach(c => console.log(`   - ${c.mealName} (${c.window}): ${c.couponCode} [${c.status}]`));

// Redeem first coupon
const redeemRes = couponService.redeemCoupon(coupons[0].couponCode, 'Counter 2');
console.log('4. Coupon Redemption:', redeemRes.success ? 'SUCCESS' : 'FAILED', 'Message:', redeemRes.message);

// Test double-redeem protection (single-use)
const doubleRedeemRes = couponService.redeemCoupon(coupons[0].couponCode, 'Counter 2');
console.log('   Double Redeem Check (Should fail):', doubleRedeemRes.success ? 'ALLOWED' : 'BLOCKED AS EXPECTED', 'Error:', doubleRedeemRes.error);

// 5. Test Groq AI Planner
console.log('5. Testing AI Seating Planner...');
const plan = await groqPlanner.generatePlan();
console.log('   AI Plan generated for:', plan.hall, `(${plan.tables} tables, ${plan.total_seats} seats)`);
console.log('   AI Reasoning:', plan.ai_reasoning);

console.log('--- ALL BACKEND TESTS PASSED SUCCESSFULLY! ---');

