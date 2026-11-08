import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, AlertCircle, Utensils, Armchair, Sparkles, Mail, Send, Check, Loader2, X } from 'lucide-react';
import { api } from '../services/api';

export const ParticipantTicketView = () => {
  const [selectedTicketId, setSelectedTicketId] = useState('HU-26-0187');
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState({ configured: false });

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const sampleParticipants = [
    { ticketId: 'HU-26-0187', name: 'Aarav Sharma', team: 'CodeNova', state: 'Pending Desk Scan' },
    { ticketId: 'HU-26-0185', name: 'Priya Nair', team: 'CodeNova', state: 'Checked-in & Seated' },
    { ticketId: 'HU-26-0192', name: 'Sneha Reddy', team: 'DevDynasty', state: 'Slot Pending' },
    { ticketId: 'HU-26-0189', name: 'Rohan Prakash', team: 'ByteForce', state: 'Pending Desk Scan' }
  ];

  const fetchTicket = async (id) => {
    setLoading(true);
    setSendResult(null);
    try {
      const data = await api.getParticipantTicket(id);
      setTicketData(data);
      if (data?.participant?.email) {
        setTargetEmail(data.participant.email);
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket(selectedTicketId);
  }, [selectedTicketId]);

  useEffect(() => {
    api.getEmailStatus().then(status => {
      if (status && status.success) {
        setEmailStatus(status);
      }
    });
  }, []);

  const handleSendEmail = async () => {
    if (!targetEmail || !ticketData?.participant) return;
    setIsSending(true);
    setSendResult(null);

    try {
      const res = await api.sendTicketEmail(ticketData.participant.id, targetEmail);
      if (res.success) {
        setSendResult({
          type: 'success',
          message: `Ticket successfully delivered to ${targetEmail} via Resend! (ID: ${res.resendId})`
        });
        setTimeout(() => {
          setIsEmailModalOpen(false);
          setSendResult(null);
        }, 3000);
      } else {
        setSendResult({
          type: 'error',
          message: res.error || 'Failed to deliver ticket via Resend'
        });
      }
    } catch (err) {
      setSendResult({
        type: 'error',
        message: err.message || 'Network error while calling Resend'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header and Attendee Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Participant Ticket Experience</h1>
            {emailStatus.configured && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Resend Connected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Live ticket view sent to attendee email via Resend and accessible on mobile PWA</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSendResult(null);
              setIsEmailModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition shadow-2xs"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Ticket</span>
          </button>

          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">Attendee:</span>
          <select
            value={selectedTicketId}
            onChange={(e) => setSelectedTicketId(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
          >
            {sampleParticipants.map((p) => (
              <option key={p.ticketId} value={p.ticketId}>
                {p.name} ({p.ticketId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Email Sender Modal */}
      {isEmailModalOpen && ticketData?.participant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Email Digital Ticket</h3>
                  <p className="text-[10px] text-slate-400">Powered by Resend API</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-600">
                <div>Attendee: <strong className="text-slate-900">{ticketData.participant.name}</strong></div>
                <div>Ticket ID: <strong className="font-mono text-slate-900">{ticketData.participant.ticketId}</strong></div>
                <div>Team: <span className="font-semibold text-sky-600">{ticketData.participant.teamName}</span></div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Recipient Email Address:</label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="e.g. attendee@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Resend will deliver a responsive HTML ticket with QR pass, seat info, and food coupons.
                </p>
              </div>

              {sendResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    sendResult.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {sendResult.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="break-all">{sendResult.message}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleSendEmail}
                disabled={isSending || !targetEmail}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending with Resend...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Ticket Email</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Card Phone Frame (Matching Page 5 Concept Design) */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm bg-white rounded-3xl border-8 border-slate-800 shadow-2xl overflow-hidden p-6 relative">
          {/* Phone Top Speaker bar */}
          <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto -mt-6 mb-4"></div>

          {loading || !ticketData ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              {/* Event Header */}
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-extrabold text-lg text-slate-900">Hacker's</span>
                  <span className="font-extrabold text-lg text-orange-500">Unity</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Entry Ticket</p>
              </div>

              {/* Participant & Team */}
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{ticketData.participant.name}</h2>
                <p className="text-xs font-bold text-sky-600 mt-0.5">Team {ticketData.participant.teamName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{ticketData.participant.email}</p>
              </div>

              {/* Tamper-proof QR Code Container */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
                <QRCodeSVG
                  value={ticketData.qrToken || ticketData.participant.ticketId}
                  size={180}
                  level="H"
                  includeMargin={true}
                  className="mx-auto rounded-lg"
                />
              </div>

              {/* Ticket ID & Confirmation Status */}
              <div>
                <span className="font-mono text-sm font-bold text-slate-700 tracking-wider">
                  {ticketData.participant.ticketId}
                </span>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                      ticketData.participant.slotStatus === 'CONFIRMED'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {ticketData.participant.slotStatus === 'CONFIRMED' ? 'SLOT CONFIRMED' : 'SLOT PENDING'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Valid for Day 1 and Day 2</p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">Show this QR at the entry desk</p>
              </div>

              {/* Quick Email Ticket Button inside Phone frame */}
              <button
                onClick={() => {
                  setSendResult(null);
                  setIsEmailModalOpen(true);
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send to My Email</span>
              </button>

              {/* Dynamic Assigned Seat Section (If Checked In) */}
              {ticketData.participant.assignedSeat ? (
                <div className="bg-sky-50 rounded-2xl p-4 border border-sky-200 text-center animate-in fade-in">
                  <div className="flex items-center justify-center gap-1.5 text-sky-700 text-xs font-bold uppercase tracking-wider mb-1">
                    <Armchair className="w-3.5 h-3.5" />
                    <span>Assigned Seat</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    {ticketData.participant.assignedSeat}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-400">
                  Seat will be assigned instantly upon desk QR scan
                </div>
              )}

              {/* Meal Coupons Section */}
              {ticketData.coupons && ticketData.coupons.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Food Coupons</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Diet: {ticketData.participant.diet}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {ticketData.coupons.map((coupon, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          coupon.status === 'REDEEMED'
                            ? 'bg-slate-100/70 border-slate-200 opacity-60'
                            : coupon.status === 'VALID'
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{coupon.mealName}</div>
                          <div className="text-[10px] text-slate-500">{coupon.window}</div>
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">{coupon.couponCode}</div>
                        </div>

                        <div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              coupon.status === 'REDEEMED'
                                ? 'bg-slate-200 text-slate-600'
                                : coupon.status === 'VALID'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {coupon.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
