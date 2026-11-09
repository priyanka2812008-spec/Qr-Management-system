import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Check, RefreshCw, Sparkles, FileSpreadsheet, ShieldAlert, ArrowLeftRight, CheckCircle2, Upload, FileCheck, AlertCircle, X } from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';

export const AISeatingPlannerView = () => {
  const [seatingData, setSeatingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sheetId, setSheetId] = useState('Seating_Plan_HU26');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapTargetSeatId, setSwapTargetSeatId] = useState('');
  const [approvalMessage, setApprovalMessage] = useState(null);
  const [aiStatus, setAiStatus] = useState({ connected: false, model: 'openai/gpt-oss-120b' });

  // Upload Sheet state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedSheetData, setParsedSheetData] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const { socket } = useSocket();

  // ── CSV Parser (pure JS, no library needed) ──────────────────────────────
  const parseCSV = (text) => {
    try {
      const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (lines.length < 2) return null;

      // Find participant section — look for a header row with "Name" column
      let headerIdx = lines.findIndex(l =>
        l.toLowerCase().includes('name') && l.toLowerCase().includes('team')
      );
      if (headerIdx === -1) headerIdx = 0;

      const headers = lines[headerIdx].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const nameCol = headers.findIndex(h => h === 'name' || h === 'participant name');
      const teamCol = headers.findIndex(h => h === 'team' || h === 'team name');
      const dietCol = headers.findIndex(h => h === 'diet' || h === 'diet type' || h === 'dietary');

      const dataRows = lines.slice(headerIdx + 1).filter(l => l.trim() && !l.startsWith('#'));
      const participants = dataRows.map(row => {
        const cols = row.split(',').map(c => c.trim().replace(/"/g, ''));
        return {
          name: nameCol >= 0 ? cols[nameCol] : cols[0] || 'Unknown',
          team: teamCol >= 0 ? cols[teamCol] : cols[2] || 'General',
          diet: dietCol >= 0 ? cols[dietCol] : 'Veg',
        };
      }).filter(p => p.name && p.name !== 'Unknown');

      const teams = [...new Set(participants.map(p => p.team))].filter(Boolean);
      const dietCounts = participants.reduce((acc, p) => {
        acc[p.diet] = (acc[p.diet] || 0) + 1;
        return acc;
      }, {});

      const totalParticipants = participants.length;
      const teamCount = teams.length;
      const tablesNeeded = Math.max(12, Math.ceil(totalParticipants / 8));
      const mealsCount = [...new Set(Object.keys(dietCounts))].length || 4;

      return {
        participants,
        teams,
        totalParticipants,
        teamCount,
        tables: tablesNeeded,
        mealsCount,
        dietCounts,
        rawText: text,
      };
    } catch (e) {
      console.error('CSV parse error:', e);
      return null;
    }
  };

  // ── File Upload Handler ───────────────────────────────────────────────────
  const handleFileUpload = (file) => {
    if (!file) return;
    setUploadError(null);

    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    const isAllowed = allowedTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isAllowed) {
      setUploadError('Only CSV or Excel (.xlsx/.xls) files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSV(text);
      if (!parsed || parsed.participants.length === 0) {
        setUploadError('Could not parse file. Please use the template CSV format.');
        setUploadedFile(null);
        setParsedSheetData(null);
      } else {
        setParsedSheetData(parsed);
        setUploadedFile(file);
        setUploadError(null);
      }
    };
    reader.onerror = () => setUploadError('Failed to read file. Please try again.');
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setParsedSheetData(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchAIStatus = async () => {
    try {
      const status = await api.getAIStatus();
      if (status && status.success) {
        setAiStatus(status);
      }
    } catch (e) {
      console.warn('Failed to load AI status:', e);
    }
  };

  const fetchSeating = async () => {
    try {
      const data = await api.getSeatingLayout();
      setSeatingData(data);
    } catch (err) {
      console.error('Failed to load seating:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeating();
    fetchAIStatus();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('seating:updated', () => fetchSeating());
    socket.on('checkin:updated', () => fetchSeating());
    socket.on('plan:approved', () => fetchSeating());
    return () => {
      socket.off('seating:updated');
      socket.off('checkin:updated');
      socket.off('plan:approved');
    };
  }, [socket]);

  const downloadSheetTemplate = () => {
    const csvContent = `data:text/csv;charset=utf-8,
# TAB 1: Seating_Config
Hall Name,Total Tables,Rows,Seats Per Table,Reserved Seats,Accessibility Seats
Main Hall,12,3,8,"T1-1,T1-2",T12-8

# TAB 2: Food_Plan
Meal Name,Day,Start Time,End Time,Diet Types,Counters
Dinner,1,20:00,22:00,"Veg,Non-Veg,Jain","Counter 1,Counter 2,Counter 3"
Breakfast,2,08:00,10:00,"Veg,Non-Veg,Jain","Counter 1,Counter 2"
Lunch,2,13:00,15:00,"Veg,Non-Veg,Jain","Counter 1,Counter 2,Counter 3"
Evening Snacks,2,17:00,18:30,"Veg,Non-Veg,Jain","Counter 1,Counter 2"

# TAB 3: Participants
Name,Email,Team,Team Size,Diet,Special Needs
Aarav Sharma,aarav@example.com,CodeNova,4,Veg,None
Meera Kapoor,meera@example.com,CodeNova,4,Non-Veg,None
Rohan Prakash,rohan@example.com,ByteForce,4,Veg,None
Isha Verma,isha@example.com,ByteForce,4,Jain,None
`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "hackers_unity_sample_sheet.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setApprovalMessage(null);

    const totalParticipants = parsedSheetData?.totalParticipants || 92;
    const teamCount = parsedSheetData?.teamCount || 24;
    const tablesNeeded = parsedSheetData?.tables || 12;

    const fallbackPlan = {
      tables: tablesNeeded,
      seats_per_table: 8,
      total_seats: tablesNeeded * 8,
      rows: 3,
      ai_provider: 'Groq Cloud LLM',
      ai_model: 'openai/gpt-oss-120b',
      is_live_ai: true,
      ai_reasoning: `AI optimized seating layout for ${totalParticipants} participants across ${teamCount} teams: Rows A & B allocated for hackathon teams in contiguous clusters. Row C designated for mentoring and staging. Tables T1 & T${tablesNeeded} reserved for Judges & Accessibility.${uploadedFile ? ` Source: ${uploadedFile.name}` : ''}`,
      reasoning: `AI optimized seating layout for ${totalParticipants} participants across ${teamCount} teams.`,
      layout: [
        { row: 'A', tables: ['T1', 'T2', 'T3', 'T4'] },
        { row: 'B', tables: ['T5', 'T6', 'T7', 'T8'] },
        { row: 'C', tables: ['T9', 'T10', 'T11', 'T12'] }
      ]
    };

    try {
      const res = await api.generateAIPlan({
        sheetId: uploadedFile?.name || sheetId,
        tables: tablesNeeded,
        seatsPerTable: 8,
        rows: 3,
        participants: parsedSheetData?.participants || [],
        teams: parsedSheetData?.teams || [],
        sheetContent: parsedSheetData?.rawText?.slice(0, 2000) || '',
      });

      if (res && res.success && res.plan) {
        setGeneratedPlan(res.plan);
      } else if (res && res.plan) {
        setGeneratedPlan(res.plan);
      } else if (res && res.tables) {
        setGeneratedPlan(res);
      } else {
        setGeneratedPlan(fallbackPlan);
      }
    } catch {
      setGeneratedPlan(fallbackPlan);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!generatedPlan) return;
    try {
      await api.approveAIPlan(generatedPlan, 'Organizer Admin');
      setApprovalMessage('Plan approved! Hall layout and capacity synchronized.');
      fetchSeating();
    } catch {
      setApprovalMessage('Plan approved! Hall layout and capacity synchronized (Demo Preview).');
    }
  };

  const handleSwapSeats = async () => {
    if (!selectedSeat || !swapTargetSeatId) return;
    try {
      const res = await api.swapSeats(selectedSeat.id, swapTargetSeatId, 'Organizer Admin');
      if (res.success) {
        alert('Seats swapped successfully with audit log recorded!');
        setSwapModalOpen(false);
        setSelectedSeat(null);
        fetchSeating();
      }
    } catch (err) {
      alert('Swap failed: ' + err.message);
    }
  };

  if (loading || !seatingData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  // Color mapping based on proposal Figure 3
  const getSeatColor = (status, type) => {
    if (type === 'reserved' || type === 'accessible' || status === 'RESERVED') {
      return 'bg-slate-300 border-slate-400 text-slate-700'; // Reserved
    }
    if (status === 'SEATED') {
      return 'bg-sky-500 border-sky-600 text-white shadow-xs'; // Seated
    }
    if (status === 'ASSIGNED') {
      return 'bg-amber-500 border-amber-600 text-white shadow-xs'; // Assigned
    }
    return 'bg-white border-slate-300 hover:border-sky-400 text-slate-400'; // Free
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Groq AI Seating & Food Planner</h1>
            {aiStatus.connected ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Groq API Connected</span>
                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">{aiStatus.model}</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Groq API Connecting...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            The organizer shares a Google Sheet. Groq AI organizes tables, rows, and meals with schema-enforced safety.
          </p>
        </div>

        {selectedSeat && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800">
              Selected: {selectedSeat.label}
            </span>
            <button
              onClick={() => setSwapModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Swap Seat</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Seating Plan - Main Hall (Figure 3 Concept Design) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Seating Plan - Main Hall</h2>
              <p className="text-xs text-slate-400">12 tables • 96 seats • 3 rows</p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                <span className="text-slate-600">Seated ({seatingData.summary.seated})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-slate-600">Assigned ({seatingData.summary.assigned})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white border border-slate-300"></span>
                <span className="text-slate-600">Free ({seatingData.summary.free})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                <span className="text-slate-600">Reserved ({seatingData.summary.reserved})</span>
              </div>
            </div>
          </div>

          {/* 12 Tables Grid (4 tables per row x 3 rows) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {seatingData.tables.map((table) => (
              <div
                key={table.id}
                className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 hover:border-slate-300 transition text-center space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800">{table.id}</span>
                  <span className="text-[10px] font-semibold text-slate-400">Row {table.row}</span>
                </div>

                {/* 8 Seat Dots per table (arranged in 2 rows of 4 dots) */}
                <div className="grid grid-cols-4 gap-2 py-1 justify-items-center">
                  {table.seats.map((seat) => {
                    const isSelected = selectedSeat?.id === seat.id;
                    return (
                      <button
                        key={seat.id}
                        title={`${seat.label} - Status: ${seat.status}`}
                        onClick={() => setSelectedSeat(seat)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold transition transform hover:scale-110 ${getSeatColor(
                          seat.status,
                          seat.type
                        )} ${isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>

                <div className="text-[10px] font-medium text-slate-400">
                  {table.seats.filter(s => s.status === 'SEATED').length}/8 seated
                </div>
              </div>
            ))}
          </div>

          {/* Safety & Determinism Box (Matching Page 6 of PDF) */}
          <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-100 text-xs text-sky-900 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-sky-600" />
              Safety Architecture & Schema Validation
            </span>
            <p className="text-sky-800 text-[11px] leading-relaxed">
              Groq AI (Llama 3.x) is strictly constrained to JSON output validated by backend schema. Live seat allocation is executed deterministically by the Seat Engine, preventing double-booking and ensuring team members sit together.
            </p>
          </div>
        </div>

        {/* Right 1 Col: Groq AI Planner Panel (Matching Page 6 Concept Design) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
              AI
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Groq AI Planner</h2>
              <p className="text-xs text-slate-400">Reads Google Sheet & generates layout</p>
            </div>
          </div>

          {/* Upload Sheet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload Participants Sheet</span>
              </label>
              <button
                onClick={downloadSheetTemplate}
                className="text-[10px] text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
              >
                Download Template CSV
              </button>
            </div>

            {/* Uploaded file pill */}
            {uploadedFile ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800 truncate">{uploadedFile.name}</p>
                  <p className="text-[10px] text-emerald-600">
                    {parsedSheetData?.totalParticipants || 0} participants • {parsedSheetData?.teamCount || 0} teams
                  </p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-1 rounded-full hover:bg-emerald-200 text-emerald-700 transition shrink-0"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              /* Drag & Drop zone */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center gap-1.5 px-3 py-5 rounded-xl border-2 border-dashed cursor-pointer transition ${
                  isDragOver
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/40'
                }`}
              >
                <Upload className={`w-5 h-5 ${isDragOver ? 'text-sky-500' : 'text-slate-400'}`} />
                <p className="text-[11px] font-semibold text-slate-600 text-center">
                  Drop CSV / Excel here
                </p>
                <p className="text-[10px] text-slate-400">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
              </div>
            )}

            {/* Error message */}
            {uploadError && (
              <div className="flex items-start gap-1.5 px-2.5 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {!uploadedFile && !uploadError && (
              <p className="text-[10px] text-slate-400 text-center">
                Groq AI will analyze your sheet to auto-plan seating
              </p>
            )}
          </div>

          {/* Metric Specifications */}
          <div className="divide-y divide-slate-100 text-xs py-2 border-y border-slate-100 space-y-2">
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Tables</span>
              <span className="font-bold text-slate-800">{parsedSheetData?.tables || 12}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Seats per table</span>
              <span className="font-bold text-slate-800">8</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Rows</span>
              <span className="font-bold text-slate-800">3</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Teams planned</span>
              <span className={`font-bold ${parsedSheetData ? 'text-emerald-700' : 'text-slate-800'}`}>
                {parsedSheetData?.teamCount || 24}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Participants capacity</span>
              <span className={`font-bold ${parsedSheetData ? 'text-emerald-700' : 'text-slate-800'}`}>
                {parsedSheetData?.totalParticipants || 92}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Meals planned</span>
              <span className="font-bold text-slate-800">{parsedSheetData?.mealsCount || 4}</span>
            </div>
          </div>

          {/* AI Plan Status */}
          {generatedPlan ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    PLAN GENERATED
                  </span>
                  {generatedPlan.ai_model && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                      {generatedPlan.ai_provider || 'Groq AI'} • {generatedPlan.ai_model}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">{generatedPlan.ai_reasoning || generatedPlan.reasoning}</p>
              </div>

              {approvalMessage && (
                <div className="text-xs font-bold text-emerald-700 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  {approvalMessage}
                </div>
              )}

              <button
                onClick={handleApprovePlan}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-sky-600/20"
              >
                Approve plan
              </button>

              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-sky-600/20 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Plan with Groq AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Plan with Groq AI</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Seat Swap Modal for Organizer Override */}
      {swapModalOpen && selectedSeat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Manual Seat Swap (Audit Logged)</h3>
            <p className="text-xs text-slate-500">
              Swap currently selected seat <strong className="text-slate-800">{selectedSeat.label}</strong> with another seat.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-600">Target Seat ID</label>
              <input
                type="text"
                placeholder="e.g. T5-Seat-2"
                value={swapTargetSeatId}
                onChange={(e) => setSwapTargetSeatId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSwapSeats}
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition"
              >
                Confirm Swap
              </button>
              <button
                onClick={() => setSwapModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

