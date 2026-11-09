import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle2, AlertTriangle, XCircle, Search, User, ShieldCheck, Printer, ArrowRight, RefreshCw, Wifi, Award, Video, VideoOff, Mail, ScanLine } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export const CoordinatorScannerView = () => {
  const [tokenInput, setTokenInput] = useState('HU-26-0187');
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [checkinSuccessData, setCheckinSuccessData] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState(null);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [lastDecodedQR, setLastDecodedQR] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastDecodedQRRef = useRef(null);

  // ── Camera lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (useRealCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [useRealCamera]);

  const startCamera = async () => {
    setCameraError(null);
    lastDecodedQRRef.current = null;
    setLastDecodedQR(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraScanning(true);
          startQRDecodeLoop();
        };
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Camera error: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraScanning(false);
  };

  // ── Real-time QR Decode Loop using jsQR ──────────────────────────────────
  const startQRDecodeLoop = useCallback(() => {
    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !streamRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          const jsQR = (await import('jsqr')).default;
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data && code.data !== lastDecodedQRRef.current) {
            lastDecodedQRRef.current = code.data;
            setLastDecodedQR(code.data);
            setTokenInput(code.data);
            handleScanToken(code.data);
            return; // pause until next manual scan or reset
          }
        } catch (_) { /* silent */ }
      }

      if (streamRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Scan Handler ─────────────────────────────────────────────────────────
  const handleScanToken = async (code) => {
    if (!code) return;
    setIsScanning(true);
    setScanResult(null);
    setCheckinSuccessData(null);
    try {
      const result = await api.scanQR(code);
      setScanResult(result);
    } catch (err) {
      setScanResult({ status: 'INVALID_TOKEN', error: 'Network or scanner error' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleScan = () => handleScanToken(tokenInput.trim());

  const handleConfirmCheckin = async (override = false) => {
    if (!scanResult?.participant) return;
    setIsConfirming(true);
    try {
      const res = await api.confirmCheckin(scanResult.participant.id, 'Coordinator Desk #1', override);
      if (res.success) {
        setCheckinSuccessData(res);
        setScanResult(null);
        lastDecodedQRRef.current = null;
        setLastDecodedQR(null);
        confetti({
          particleCount: 100, spread: 70, origin: { y: 0.6 },
          colors: ['#38bdf8', '#0ea5e9', '#f97316', '#10b981']
        });
      } else {
        alert(res.error || 'Failed to confirm check-in');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEmailPass = async () => {
    if (!checkinSuccessData?.participant) return;
    setIsEmailing(true);
    setEmailStatusMsg(null);
    try {
      const res = await api.sendTicketEmail(checkinSuccessData.participant.id, checkinSuccessData.participant.email);
      setEmailStatusMsg(res.success
        ? { type: 'success', text: `Pass emailed to ${checkinSuccessData.participant.email} via Resend!` }
        : { type: 'error', text: res.error || 'Failed to send via Resend' });
    } catch (err) {
      setEmailStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsEmailing(false);
    }
  };

  const handleResetScan = () => {
    setScanResult(null);
    setCheckinSuccessData(null);
    lastDecodedQRRef.current = null;
    setLastDecodedQR(null);
    setTokenInput('');
    setEmailStatusMsg(null);
    if (useRealCamera && streamRef.current) startQRDecodeLoop();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hidden canvas for jsQR decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Coordinator Scanner</h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time camera QR verification · HMAC-SHA256 signed tickets · Instant seat &amp; coupon issuance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Viewfinder */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isCameraScanning ? (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Scanning for QR...
                </span>
              ) : 'Scanner Viewfinder'}
            </span>
            <button
              onClick={() => { setUseRealCamera(v => !v); setCameraError(null); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
            >
              {useRealCamera ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span>{useRealCamera ? 'Stop Camera' : 'Use Camera'}</span>
            </button>
          </div>

          {/* Viewfinder box */}
          <div className="relative w-full aspect-square max-w-[280px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center p-2 shadow-inner">
            {useRealCamera ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="text-slate-600 flex flex-col items-center gap-2">
                <Camera className="w-12 h-12 text-slate-500 animate-pulse" />
                <span className="text-[11px] text-slate-400 font-mono text-center px-4">
                  Click "Use Camera" to start<br />live QR scanning
                </span>
              </div>
            )}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-sky-400 rounded-tl pointer-events-none" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-sky-400 rounded-tr pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-sky-400 rounded-bl pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-sky-400 rounded-br pointer-events-none" />
            {isCameraScanning && (
              <div className="absolute left-4 right-4 h-0.5 bg-sky-400/80 shadow-[0_0_8px_2px_rgba(56,189,248,0.6)] pointer-events-none animate-bounce" style={{ top: '50%' }} />
            )}
          </div>

          {lastDecodedQR && (
            <div className="w-full mt-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-700 font-mono truncate">
              📷 Detected: {lastDecodedQR}
            </div>
          )}

          {cameraError && (
            <div className="w-full mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
              {cameraError}
            </div>
          )}

          {/* Manual Input */}
          <div className="w-full mt-5 space-y-2">
            <label className="text-xs font-semibold text-slate-600">Manual Search / Paste QR Token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Ticket ID (e.g. HU-26-0187)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                {isScanning ? 'Verifying...' : 'Scan'}
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="w-full mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Quick Test Presets (4 States):
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '1. Valid Slot (Aarav S.)', token: 'HU-26-0187', desc: 'Valid · CONFIRMED' },
                { label: '2. Pending Slot (Sneha R.)', token: 'HU-26-0192', desc: 'Valid · PENDING' },
                { label: '3. Already Checked In (Priya N.)', token: 'HU-26-0185', desc: 'Already Checked In' },
                { label: '4. Tampered QR Code', token: 'HU_TK_TAMPERED_99999_fake_sig', desc: 'Invalid / Tampered' },
              ].map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setTokenInput(p.token); handleScanToken(p.token); }}
                  className="p-2 text-left bg-slate-50 hover:bg-sky-50 hover:border-sky-200 border border-slate-200 rounded-lg transition"
                >
                  <div className="text-xs font-bold text-slate-800">{p.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* VALID_CONFIRMED */}
          {scanResult?.status === 'VALID_CONFIRMED' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/40 shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ticket verified — Ready to check in</span>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">{scanResult.participant.name}</h3>
                <div className="text-sm font-semibold text-slate-500 mt-0.5">
                  Team {scanResult.team.name} • {scanResult.team.size} members
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Slot status</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{scanResult.participant.slotStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Team check-in</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {scanResult.team.members_arrived} of {scanResult.team.size} arrived
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Ticket ID</span>
                  <span className="font-mono text-slate-700">{scanResult.participant.ticketId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Dietary</span>
                  <span className="font-semibold text-slate-800">{scanResult.participant.diet}</span>
                </div>
              </div>
              <button
                onClick={() => handleConfirmCheckin(false)}
                disabled={isConfirming}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md shadow-sky-600/30 transition flex items-center justify-center gap-2 text-base"
              >
                {isConfirming ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                  <><span>Confirm check-in</span><ArrowRight className="w-5 h-5" /></>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400">HMAC-SHA256 verified · Seat assigned deterministically</p>
            </div>
          )}

          {/* VALID_PENDING */}
          {scanResult?.status === 'VALID_PENDING' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-400/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 w-fit">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Valid — Slot not confirmed</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{scanResult.participant.name}</h3>
                <div className="text-sm text-slate-500">Team {scanResult.team.name}</div>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Team found but slot is pending or waitlisted.</p>
                <p className="text-amber-700">Send participant to help desk for manual registration or fee confirmation.</p>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => alert('Participant routed to Help Desk #2')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-sm"
                >Send to Help Desk</button>
                <button
                  onClick={() => handleConfirmCheckin(true)}
                  disabled={isConfirming}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition text-sm"
                >Organizer Override Check-in</button>
              </div>
            </div>
          )}

          {/* ALREADY_CHECKED_IN */}
          {scanResult?.status === 'ALREADY_CHECKED_IN' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-sky-400/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sky-700 font-bold text-sm bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200 w-fit">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>Already checked in</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{scanResult.participant.name}</h3>
                <div className="text-sm text-slate-500">Team {scanResult.team.name}</div>
              </div>
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">First scan time:</span>
                  <span className="font-semibold text-slate-800">
                    {scanResult.checkedInAt ? new Date(scanResult.checkedInAt).toLocaleTimeString() : 'Earlier'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Seat:</span>
                  <span className="font-mono font-bold text-sky-700">
                    {scanResult.assignedSeat || scanResult.participant?.assignedSeat || 'Assigned'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium">
                ⚠️ Do not admit again. Show existing seat details.
              </div>
            </div>
          )}

          {/* INVALID_TOKEN */}
          {scanResult?.status === 'INVALID_TOKEN' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-rose-500/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 w-fit">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Invalid / tampered QR</span>
              </div>
              <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-2">
                <p className="font-bold text-sm">Security Signature Mismatch</p>
                <p>HMAC-SHA256 verification failed. No personal details revealed for security.</p>
              </div>
              <p className="text-xs text-slate-500">Search manually by Ticket ID in the search box above.</p>
            </div>
          )}

          {/* Reset button */}
          {scanResult && (
            <button
              onClick={handleResetScan}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition text-xs"
            >Scan Next Attendee</button>
          )}

          {/* Check-in success card */}
          {checkinSuccessData && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-md space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Check-in complete!</span>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">{checkinSuccessData.participant.ticketId}</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{checkinSuccessData.participant.name}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Team {checkinSuccessData.participant.teamName}</p>
              </div>
              <div className="p-4 bg-sky-50/80 rounded-xl border border-sky-200 text-center">
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">ASSIGNED SEAT</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {checkinSuccessData.assignedSeat?.label || checkinSuccessData.seat || 'T3 - Row A - Seat 1'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-sky-600" />
                  <div>
                    <span className="font-bold text-slate-800">Wi-Fi: HU-HACKATHON-5G</span>
                    <div className="text-[10px] text-slate-500 font-mono">Password: unity2026hacker</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Active</span>
              </div>
              {checkinSuccessData.coupons?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Food coupons issued ({checkinSuccessData.coupons.length})
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {checkinSuccessData.coupons.map((c, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="font-bold text-slate-800 truncate">{c.mealName}</div>
                        <div className="text-[10px] text-slate-400">{c.window}</div>
                        <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">VALID</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => setShowBadgeModal(true)}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-md">
                    <Printer className="w-4 h-4" /><span>Print badge</span>
                  </button>
                  <button onClick={() => setShowCertModal(true)}
                    className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-md">
                    <Award className="w-4 h-4" /><span>Certificate</span>
                  </button>
                  <button onClick={handleEmailPass} disabled={isEmailing}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-md">
                    <Mail className="w-4 h-4" /><span>{isEmailing ? 'Sending...' : 'Email pass'}</span>
                  </button>
                </div>
                {emailStatusMsg && (
                  <div className={`p-2 rounded-lg text-xs font-semibold text-center ${
                    emailStatusMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>{emailStatusMsg.text}</div>
                )}
                <button onClick={handleResetScan}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-xs">
                  Scan Next Attendee
                </button>
              </div>
            </div>
          )}

          {/* Idle state */}
          {!scanResult && !checkinSuccessData && (
            <div className="bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
              <User className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Ready for Next Attendee</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Point camera at a QR code for instant live scan, or enter a Ticket ID manually.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Badge Modal */}
      {showBadgeModal && checkinSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hacker Badge Preview</span>
              <button onClick={() => setShowBadgeModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div className="border-4 border-slate-900 rounded-2xl p-6 text-center space-y-4 bg-gradient-to-b from-white to-sky-50/40">
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-black text-xl text-slate-900">Hacker's</span>
                <span className="font-black text-xl text-orange-500">Unity</span>
              </div>
              <div className="w-16 h-16 rounded-full bg-sky-100 mx-auto flex items-center justify-center text-sky-700 font-extrabold text-2xl border-2 border-sky-300">
                {checkinSuccessData.participant.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{checkinSuccessData.participant.name}</h2>
                <div className="text-xs font-bold text-slate-600 mt-1">Team: {checkinSuccessData.participant.teamName}</div>
              </div>
              <div className="py-2 px-3 bg-sky-600 text-white rounded-xl font-mono font-black text-lg shadow-sm">
                {checkinSuccessData.assignedSeat?.label || checkinSuccessData.seat}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Diet: {checkinSuccessData.participant.diet} • ID: {checkinSuccessData.participant.ticketId}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { window.print(); setShowBadgeModal(false); }}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition">
                Confirm & Print
              </button>
              <button onClick={() => setShowBadgeModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertModal && checkinSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Certificate</span>
              <button onClick={() => setShowCertModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="border-8 border-double border-sky-800 p-6 rounded-2xl text-center bg-gradient-to-b from-white to-sky-50 space-y-3">
              <div className="text-xs font-bold text-orange-500 uppercase tracking-widest">HACKER'S UNITY HACKATHON 2026</div>
              <h2 className="text-xl font-black text-slate-900 font-serif">Certificate of Participation</h2>
              <p className="text-xs text-slate-500">This certifies that</p>
              <div className="text-2xl font-black text-sky-700 underline decoration-sky-300 underline-offset-4">
                {checkinSuccessData.participant.name}
              </div>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                has successfully checked in with <strong>Team {checkinSuccessData.participant.teamName}</strong> and is officially participating in the 36-hour Hacker's Unity Hackathon.
              </p>
              <div className="flex justify-between items-end pt-4 text-[10px] text-slate-400 border-t border-slate-200">
                <span>Verified Desk Scan: {new Date().toLocaleDateString()}</span>
                <span className="font-mono">{checkinSuccessData.participant.ticketId}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { window.print(); setShowCertModal(false); }}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs">
                Print Certificate
              </button>
              <button onClick={() => setShowCertModal(false)} className="px-4 py-2.5 bg-slate-100 rounded-xl text-xs font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
