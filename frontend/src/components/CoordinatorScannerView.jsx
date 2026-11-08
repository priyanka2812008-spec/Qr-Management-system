import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertTriangle, XCircle, Search, User, ShieldCheck, Printer, ArrowRight, RefreshCw, Wifi, Award, Video, VideoOff, Mail } from 'lucide-react';
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
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Test ticket presets matching PDF specs
  const testPresets = [
    { label: '1. Valid Slot (Aarav S.)', token: 'HU-26-0187', desc: 'Valid - Slot Confirmed' },
    { label: '2. Pending Slot (Sneha R.)', token: 'HU-26-0192', desc: 'Valid - Slot Pending' },
    { label: '3. Already Checked In (Priya N.)', token: 'HU-26-0185', desc: 'Already Checked In' },
    { label: '4. Tampered QR Code', token: 'HU_TK_TAMPERED_99999_fake_sig', desc: 'Invalid / Tampered' },
  ];

  // Camera stream management
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
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('Camera access not supported in this browser.');
      }
    } catch (err) {
      setCameraError('Camera permission denied or camera not found.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleScan = async (codeToScan) => {
    const code = codeToScan || tokenInput;
    if (!code) return;

    setIsScanning(true);
    setCheckinSuccessData(null);

    try {
      const result = await api.scanQR(code);
      setScanResult(result);
    } catch (err) {
      setScanResult({
        status: 'INVALID_TOKEN',
        error: 'Network or scanner error occurred'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmCheckin = async (override = false) => {
    if (!scanResult?.participant) return;

    setIsConfirming(true);
    try {
      const res = await api.confirmCheckin(
        scanResult.participant.id,
        'Coordinator Desk #1',
        override
      );

      if (res.success) {
        setCheckinSuccessData(res);
        setScanResult(null);

        // Confetti celebration for successful check-in
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      } else {
        alert(res.error || 'Failed to confirm check-in');
      }
    } catch (err) {
      alert('Error confirming check-in: ' + err.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEmailPass = async () => {
    if (!checkinSuccessData?.participant) return;
    setIsEmailing(true);
    setEmailStatusMsg(null);
    try {
      const res = await api.sendTicketEmail(
        checkinSuccessData.participant.id,
        checkinSuccessData.participant.email
      );
      if (res.success) {
        setEmailStatusMsg({ type: 'success', text: `Pass emailed to ${checkinSuccessData.participant.email} via Resend!` });
      } else {
        setEmailStatusMsg({ type: 'error', text: res.error || 'Failed to send pass via Resend' });
      }
    } catch (err) {
      setEmailStatusMsg({ type: 'error', text: err.message || 'Error emailing pass' });
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & PWA Header */}
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Coordinator Scanner</h1>
        <p className="text-xs text-slate-500 mt-1">
          Camera-based QR verification and instant seat allocation & coupon issuance
        </p>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Viewfinder & Camera */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scanner Viewfinder</span>
            <button
              onClick={() => setUseRealCamera(!useRealCamera)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
            >
              {useRealCamera ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span>{useRealCamera ? 'Stop Webcam' : 'Use Webcam'}</span>
            </button>
          </div>

          {/* Scanner Viewfinder Box */}
          <div className="relative w-full aspect-square max-w-[280px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center p-2 shadow-inner">
            {useRealCamera ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="text-slate-600 flex flex-col items-center">
                <Camera className="w-12 h-12 text-slate-500 mb-2 animate-pulse" />
                <span className="text-[11px] text-slate-400 font-mono">Point camera at QR</span>
              </div>
            )}

            {/* Target Reticle corners */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-sky-400 rounded-tl pointer-events-none"></div>
            <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-sky-400 rounded-tr pointer-events-none"></div>
            <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-sky-400 rounded-bl pointer-events-none"></div>
            <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-sky-400 rounded-br pointer-events-none"></div>

            {/* Scanning Laser Animation */}
            <div className="scanner-laser"></div>
          </div>

          {cameraError && (
            <div className="w-full mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
              {cameraError} You can use the instant presets below!
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="w-full mt-6 space-y-2">
            <label className="text-xs font-semibold text-slate-600">Manual Search / Scanned QR Token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Ticket ID (e.g. HU-26-0187)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
              <button
                onClick={() => handleScan()}
                disabled={isScanning}
                className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition shadow-sm disabled:opacity-50"
              >
                {isScanning ? 'Verifying...' : 'Scan'}
              </button>
            </div>
          </div>

          {/* Test Presets for Demo */}
          <div className="w-full mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Instant Test Presets (4 Result States):
            </span>
            <div className="grid grid-cols-2 gap-2">
              {testPresets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTokenInput(preset.token);
                    handleScan(preset.token);
                  }}
                  className="p-2 text-left bg-slate-50 hover:bg-sky-50 hover:border-sky-200 border border-slate-200 rounded-lg transition"
                >
                  <div className="text-xs font-bold text-slate-800">{preset.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Scan Results & Instant Verification Card (Matching Page 5 Figure 2) */}
        <div className="space-y-4">
          {/* Result 1: Ticket verified - Confirm Check-in State */}
          {scanResult?.status === 'VALID_CONFIRMED' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/40 shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ticket verified</span>
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
                  <span className="text-slate-400 block font-medium">Dietary preference</span>
                  <span className="font-semibold text-slate-800">{scanResult.participant.diet}</span>
                </div>
              </div>

              <button
                onClick={() => handleConfirmCheckin(false)}
                disabled={isConfirming}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md shadow-sky-600/30 transition flex items-center justify-center gap-2 text-base"
              >
                {isConfirming ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Confirm check-in</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400">Scan completes in under 2 seconds</p>
            </div>
          )}

          {/* Result 2: Valid - Slot not confirmed State */}
          {scanResult?.status === 'VALID_PENDING' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-400/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 w-fit">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Valid - Slot not confirmed</span>
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
                >
                  Send to Help Desk
                </button>
                <button
                  onClick={() => handleConfirmCheckin(true)}
                  disabled={isConfirming}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition text-sm"
                >
                  Organizer Override Check-in
                </button>
              </div>
            </div>
          )}

          {/* Result 3: Already checked in State */}
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
                    {new Date(scanResult.checkedInAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Seat:</span>
                  <span className="font-mono font-bold text-sky-700">{scanResult.assignedSeat || 'Assigned'}</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium">
                ⚠️ Do not admit again. Show existing seat details.
              </div>
            </div>
          )}

          {/* Result 4: Invalid / tampered QR State */}
          {scanResult?.status === 'INVALID_TOKEN' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-rose-500/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 w-fit">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Invalid / tampered QR</span>
              </div>

              <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-2">
                <p className="font-bold text-sm">Security Signature Mismatch</p>
                <p>
                  Red warning: QR token hash could not be validated. No personal details revealed for security.
                </p>
              </div>

              <p className="text-xs text-slate-500">
                Search manually by participant email or official ticket ID in the search bar.
              </p>
            </div>
          )}

          {/* Success Check-in Complete Card (Page 5 Figure 2: Step 3) */}
          {checkinSuccessData && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-md space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Check-in complete</span>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">
                  {checkinSuccessData.participant.ticketId}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">{checkinSuccessData.participant.name}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Team {checkinSuccessData.participant.teamName}
                </p>
              </div>

              {/* Assigned Seat Highlight */}
              <div className="p-4 bg-sky-50/80 rounded-xl border border-sky-200 text-center">
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">
                  ASSIGNED SEAT
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {checkinSuccessData.assignedSeat.label}
                </span>
              </div>

              {/* Wi-Fi & Credentials */}
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

              {/* Food Coupons issued */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Food coupons issued ({checkinSuccessData.coupons.length})
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {checkinSuccessData.coupons.map((c, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800 truncate">{c.mealName}</div>
                      <div className="text-[10px] text-slate-400">{c.window}</div>
                      <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        VALID
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Print Badge, Certificate & Resend Email Pass */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBadgeModal(true)}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-md"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print badge</span>
                  </button>
                  <button
                    onClick={() => setShowCertModal(true)}
                    className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-md"
                  >
                    <Award className="w-4 h-4" />
                    <span>Certificate</span>
                  </button>
                  <button
                    onClick={handleEmailPass}
                    disabled={isEmailing}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-md"
                    title="Send Ticket & Seat Pass to Attendee via Resend"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{isEmailing ? 'Sending...' : 'Email pass'}</span>
                  </button>
                </div>

                {emailStatusMsg && (
                  <div className={`p-2 rounded-lg text-xs font-semibold text-center ${
                    emailStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {emailStatusMsg.text}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Idle state prompt */}
          {!scanResult && !checkinSuccessData && (
            <div className="bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
              <User className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Ready for Next Attendee</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Scan attendee QR code or choose a quick preset on the left to verify team status and assign seats.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Badge Print Modal */}
      {showBadgeModal && checkinSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hacker Badge Preview</span>
              <button
                onClick={() => setShowBadgeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Badge Layout */}
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
                <div className="text-xs font-bold text-slate-600 mt-1">
                  Team: {checkinSuccessData.participant.teamName}
                </div>
              </div>

              <div className="py-2 px-3 bg-sky-600 text-white rounded-xl font-mono font-black text-lg shadow-sm">
                {checkinSuccessData.assignedSeat.label}
              </div>

              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Diet: {checkinSuccessData.participant.diet} • ID: {checkinSuccessData.participant.ticketId}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.print();
                  setShowBadgeModal(false);
                }}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition"
              >
                Confirm & Print
              </button>
              <button
                onClick={() => setShowBadgeModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal (Page 10 Future Enhancement) */}
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
              <button
                onClick={() => { window.print(); setShowCertModal(false); }}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs"
              >
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
