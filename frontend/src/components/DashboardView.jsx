import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, Utensils, Download, ArrowUpRight, Search, CheckCircle2, AlertCircle, ShieldCheck, KeyRound, Mail, BrainCircuit } from 'lucide-react';
import { api } from '../services/api';
import { fallbackStats } from '../services/mockData';
import { useSocket } from '../context/SocketContext';

export const DashboardView = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [securityStatus, setSecurityStatus] = useState(null);
  const { socket } = useSocket();

  const fetchDashboardStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data || fallbackStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    // Load security status once on mount
    api.getSecurityStatus().then(s => {
      if (s && s.success) setSecurityStatus(s);
    });
  }, []);

  // Listen for real-time socket updates from checkin, seating, coupons
  useEffect(() => {
    if (!socket) return;

    socket.on('checkin:updated', () => {
      fetchDashboardStats();
    });

    socket.on('coupon:redeemed', () => {
      fetchDashboardStats();
    });

    socket.on('plan:approved', () => {
      fetchDashboardStats();
    });

    socket.on('db:reset', () => {
      fetchDashboardStats();
    });

    return () => {
      socket.off('checkin:updated');
      socket.off('coupon:redeemed');
      socket.off('plan:approved');
      socket.off('db:reset');
    };
  }, [socket]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  const { counters, hourlyGraph, recentCheckins, teams, event } = stats;

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.seats.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Header matching Figure 1 from Proposal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
              {api.isOfflineMode() ? 'Demo Preview' : 'Live'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {event?.name || "Hackathon 2026 - Day 1"} • {event?.venue || "Main Tech Hall"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={api.exportCSVUrl}
            download="hackers_unity_attendance.csv"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => onNavigate('scanner')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition shadow-sm shadow-sky-600/20"
          >
            <span>Open Scanner</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {api.isOfflineMode() && (
        <div className="bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 border border-sky-200/80 text-sky-900 px-4 py-3 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
            <span>
              <strong>Zero-Lag Demo Mode:</strong> Viewing full interactive data. For real-time multi-device syncing across the web, deploy the backend to Render/Railway and add <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-sky-800">VITE_API_URL</code> in Vercel.
            </span>
          </div>
        </div>
      )}

      {/* 4 Live Counters Grid (Page 4 of PDF) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Registered */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-slate-900">{counters.registered}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">100% capacity registered</div>
        </div>

        {/* Checked-in */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs hover:border-sky-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Checked-in</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-sky-600">{counters.checkedIn}</span>
          </div>
          <div className="mt-2 text-xs text-sky-600/80 font-medium">
            {Math.round((counters.checkedIn / counters.registered) * 100)}% attendance arrived
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-xs hover:border-amber-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pending</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-amber-500">{counters.pending}</span>
          </div>
          <div className="mt-2 text-xs text-amber-600/80 font-medium">Expected in next slots</div>
        </div>

        {/* Coupons issued */}
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Coupons issued</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-emerald-600">{counters.couponsIssued}</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600/80 font-medium">1:1 matched with checked-in</div>
        </div>
      </div>

      {/* Middle Row: Hourly Graph & Recent Check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Arrival Chart (2 Cols on lg) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Check-ins by hour</h2>
              <p className="text-xs text-slate-400">Peak arrival analytics to optimize coordinator desks</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
              Peak: 10 AM (85/hr)
            </span>
          </div>

          {/* Bar Chart Visualization matching PDF Concept */}
          <div className="h-56 flex items-end justify-between gap-2 pt-6 px-2">
            {hourlyGraph.map((item, idx) => {
              const maxVal = Math.max(...hourlyGraph.map(g => g.count), 90);
              const heightPercent = (item.count / maxVal) * 100;
              const isPeak = item.count === Math.max(...hourlyGraph.map(g => g.count));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-md">
                    {item.count} check-ins at {item.hour}
                  </div>
                  <div className="w-full max-w-[42px] bg-sky-50 rounded-t-lg flex items-end justify-center h-44 p-1">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        isPeak ? 'bg-sky-600 shadow-md shadow-sky-600/30' : 'bg-sky-400/80 hover:bg-sky-500'
                      }`}
                    ></div>
                  </div>
                  <span className={`mt-3 text-xs font-semibold ${isPeak ? 'text-sky-700 font-bold' : 'text-slate-500'}`}>
                    {item.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Check-ins Live Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent check-ins</h2>
            <span className="text-xs font-semibold text-sky-600">Live stream</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
            {recentCheckins.map((attendee, idx) => {
              const colors = ['bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700', 'bg-rose-100 text-rose-700'];
              const colorClass = colors[idx % colors.length];
              const initial = attendee.name.charAt(0);

              return (
                <div key={attendee.id || idx} className="py-2.5 flex items-center justify-between group hover:bg-slate-50/50 rounded-lg px-2 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs ${colorClass}`}>
                      {initial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{attendee.name}</div>
                      <div className="text-[11px] text-slate-400">{attendee.team}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                      {attendee.seat}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{attendee.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Status Table (Page 4 of PDF) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hackathon Teams</h2>
            <p className="text-xs text-slate-500">Member arrival tracking, table allocations, and slot confirmations</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search team or seat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Team</th>
                <th className="py-3 px-6">Members</th>
                <th className="py-3 px-6">Slot</th>
                <th className="py-3 px-6">Seats</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeams.map((team) => (
                <tr key={team.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-6 font-semibold text-slate-800">{team.name}</td>
                  <td className="py-3.5 px-6 font-mono text-xs">{team.members}</td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {team.slot}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-slate-700">{team.seats}</td>
                  <td className="py-3.5 px-6">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        team.status === 'Seated'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : team.status === 'Checked-in'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {team.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Integrations Status Panel */}
      {securityStatus && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            Security & Integration Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* QR HMAC */}
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${
              securityStatus.qrSigning?.secretConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <KeyRound className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold">QR HMAC-SHA256</div>
                <div className="text-[10px] opacity-75 font-mono">
                  {securityStatus.qrSigning?.secretConfigured ? securityStatus.qrSigning.secretPreview : 'Not set'}
                </div>
              </div>
            </div>

            {/* JWT */}
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${
              securityStatus.jwtAuth?.secretConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold">JWT HS256</div>
                <div className="text-[10px] opacity-75 font-mono">
                  {securityStatus.jwtAuth?.secretConfigured ? securityStatus.jwtAuth.secretPreview : 'Not set'}
                </div>
              </div>
            </div>

            {/* Groq AI */}
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${
              securityStatus.groqAi?.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <BrainCircuit className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold">Groq AI</div>
                <div className="text-[10px] opacity-75 font-mono truncate max-w-[80px]">
                  {securityStatus.groqAi?.connected ? securityStatus.groqAi.keyPreview : 'Not set'}
                </div>
              </div>
            </div>

            {/* Resend Email */}
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${
              securityStatus.email?.configured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <Mail className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold">Resend Email</div>
                <div className="text-[10px] opacity-75 font-mono truncate max-w-[80px]">
                  {securityStatus.email?.configured ? securityStatus.email.keyPreview : 'Not set'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

