import React, { useState } from 'react';
import { Utensils, CheckCircle2, AlertCircle, XCircle, Clock, ShieldCheck, ArrowRight, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export const FoodCounterScannerView = () => {
  const [couponInput, setCouponInput] = useState('FC-0185-1-1');
  const [selectedCounter, setSelectedCounter] = useState('Counter 2');
  const [activeMeal, setActiveMeal] = useState('Dinner - Day 1');
  const [redemptionResult, setRedemptionResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sampleCoupons = [
    { label: 'Dinner Day 1 (Priya N. - Veg)', code: 'FC-0185-1-1', desc: 'Valid Dinner Coupon' },
    { label: 'Dinner Day 1 (Dev P. - Jain)', code: 'FC-0186-1-1', desc: 'Jain Diet Coupon' },
    { label: 'Dinner Day 1 (Tanmay R. - Non-Veg)', code: 'FC-0194-1-1', desc: 'Non-Veg Diet Coupon' },
    { label: 'Already Redeemed Coupon', code: 'FC-0185-1-1', desc: 'Test Single-Use Protection' }
  ];

  const handleRedeem = async (codeToRedeem) => {
    const code = codeToRedeem || couponInput;
    if (!code) return;

    setIsProcessing(true);
    try {
      const res = await api.redeemCoupon(code, selectedCounter);
      setRedemptionResult(res);

      if (res.success) {
        confetti({
          particleCount: 50,
          spread: 45,
          origin: { y: 0.7 }
        });
      }
    } catch (err) {
      setRedemptionResult({
        success: false,
        error: 'NETWORK_ERROR',
        message: err.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Food Counter Scanner</h1>
          <p className="text-xs text-slate-500 mt-1">
            Single-use meal coupon verification, time-window validation, and diet-aware distribution
          </p>
        </div>

        {/* Counter & Active Meal Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCounter}
            onChange={(e) => setSelectedCounter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
          >
            <option value="Counter 1">Counter 1</option>
            <option value="Counter 2">Counter 2 (Main Hall)</option>
            <option value="Counter 3">Counter 3 (Special Diet)</option>
          </select>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Food Scanner Input & Presets */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coupon Code or QR Scan</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Active Meal: Dinner - Day 1
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Enter or Scan Coupon QR Token</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. FC-0185-1-1"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="w-full px-4 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                onClick={() => handleRedeem()}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50"
              >
                {isProcessing ? 'Verifying...' : 'Redeem'}
              </button>
            </div>
          </div>

          {/* Quick Coupon Presets */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Quick Test Coupons:
            </span>
            <div className="space-y-2">
              {sampleCoupons.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCouponInput(item.code);
                    handleRedeem(item.code);
                  }}
                  className="w-full p-2.5 text-left bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded-xl transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Core Rules Box (Page 7 of PDF) */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-700 block">One-time use</span>
              <span className="text-[9px] text-slate-400">Cannot be double-claimed</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-700 block">Time-window</span>
              <span className="text-[9px] text-slate-400">Valid in slot only</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-700 block">Diet aware</span>
              <span className="text-[9px] text-slate-400">Veg / Non-Veg / Jain</span>
            </div>
          </div>
        </div>

        {/* Right: Food Counter Scan Result Card (Matching Figure 4 Concept Design) */}
        <div>
          {redemptionResult?.success ? (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-sm space-y-5 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
                <CheckCircle2 className="w-4 h-4" />
                <span>Coupon redeemed</span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  {redemptionResult.coupon.participantName}
                </h3>
                <div className="text-sm font-semibold text-slate-500 mt-0.5">
                  {redemptionResult.coupon.mealName}
                </div>
              </div>

              {/* High Visibility Diet Badge for Food Staff */}
              <div className="p-4 rounded-2xl border-2 text-center bg-amber-50/50 border-amber-300">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Food Staff Diet Direction
                </span>
                <span
                  className={`text-2xl font-black tracking-wide ${
                    redemptionResult.coupon.diet === 'Veg'
                      ? 'text-emerald-600'
                      : redemptionResult.coupon.diet === 'Jain'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {redemptionResult.coupon.diet.toUpperCase()} MEAL
                </span>
              </div>

              <div className="text-xs text-slate-500 space-y-1 py-1">
                <div className="flex justify-between">
                  <span>Redemption Time:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(redemptionResult.coupon.redeemedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Station / Counter:</span>
                  <span className="font-semibold text-slate-800">{redemptionResult.coupon.redeemedBy}</span>
                </div>
              </div>

              {/* Served counter tally progress */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Served {redemptionResult.stats?.servedCount || 214} of 287</span>
                  <span className="text-emerald-600 font-bold">
                    {Math.round(((redemptionResult.stats?.servedCount || 214) / 287) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-orange-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((redemptionResult.stats?.servedCount || 214) / 287) * 100)
                      )}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ) : redemptionResult?.error ? (
            <div className="bg-white p-6 rounded-2xl border-2 border-rose-500 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 w-fit">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Coupon Redemption Blocked</span>
              </div>

              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-2">
                <p className="font-bold text-sm">One-Time Use Violation</p>
                <p>{redemptionResult.message || 'This coupon has already been claimed or is invalid.'}</p>
              </div>

              {redemptionResult.coupon && (
                <div className="text-xs text-slate-500 space-y-1">
                  <div>Attendee: {redemptionResult.coupon.participantName}</div>
                  <div>First claimed at: {new Date(redemptionResult.coupon.redeemedAt).toLocaleTimeString()}</div>
                  <div>Station: {redemptionResult.coupon.redeemedBy}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
              <Utensils className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Food Counter Ready</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Scan attendee coupon QR to verify meal slot, diet, and single-use redemption status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

