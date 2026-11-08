import React, { useState } from 'react';
import {
  LayoutDashboard,
  QrCode,
  Ticket,
  BrainCircuit,
  Utensils,
  RotateCcw,
  ChevronLeft,
  Menu,
  X,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const Sidebar = ({ currentView, setCurrentView, onResetDemo }) => {
  const { isConnected } = useSocket();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Organizer Dashboard',
      icon: LayoutDashboard,
      desc: 'Overview & stats',
    },
    {
      id: 'scanner',
      label: 'Coordinator Scanner',
      icon: QrCode,
      desc: 'Scan QR check-in',
    },
    {
      id: 'ticket',
      label: 'Participant Ticket',
      icon: Ticket,
      desc: 'View your ticket',
    },
    {
      id: 'ai-planner',
      label: 'Groq AI Seating',
      icon: BrainCircuit,
      desc: 'AI-powered seating',
      badge: 'AI',
    },
    {
      id: 'food-counter',
      label: 'Food Counter',
      icon: Utensils,
      desc: 'Coupon scanner',
    },
  ];

  const handleNavClick = (id) => {
    setCurrentView(id);
    setMobileOpen(false);
  };

  /* ─── Reusable logo ─── */
  const Logo = ({ large = false }) => (
    <div className={`flex items-center ${large ? 'gap-3' : 'gap-2.5'}`}>
      <div
        className={`${large ? 'w-11 h-11' : 'w-9 h-9'} rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0`}
      >
        <svg
          className={`${large ? 'w-6 h-6' : 'w-5 h-5'} text-white`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight min-w-0">
        <div className="flex items-baseline gap-1">
          <span className={`font-black tracking-tight text-slate-900 ${large ? 'text-xl' : 'text-base'}`}>
            Hacker's
          </span>
          <span className={`font-black tracking-tight text-orange-500 ${large ? 'text-xl' : 'text-base'}`}>
            Unity
          </span>
        </div>
        <span className={`text-slate-400 font-medium ${large ? 'text-[11px]' : 'text-[9px]'} uppercase tracking-widest`}>
          QR &amp; Smart Seating
        </span>
      </div>
    </div>
  );

  /* ─── Single nav item ─── */
  const NavItem = ({ item, collapsed }) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;

    return (
      <button
        onClick={() => handleNavClick(item.id)}
        title={collapsed ? item.label : undefined}
        className={`w-full group relative flex items-center rounded-xl transition-all duration-200 ${
          collapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3'
        } ${
          isActive
            ? 'bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-700 font-semibold ring-1 ring-sky-200/70 shadow-sm'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 font-medium'
        }`}
      >
        {/* Active left accent bar */}
        {isActive && (
          <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-gradient-to-b from-sky-500 to-cyan-500 rounded-r-full" />
        )}

        {/* Icon box */}
        <div
          className={`shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 ${
            collapsed ? 'w-9 h-9' : 'w-8 h-8'
          } ${
            isActive
              ? 'bg-sky-100 text-sky-600'
              : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Label + description */}
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm truncate">{item.label}</span>
              {item.badge && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-gradient-to-r from-sky-500 to-cyan-500 text-white shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  {item.badge}
                </span>
              )}
            </div>
            <div className={`text-[11px] mt-0.5 ${isActive ? 'text-sky-500/70' : 'text-slate-400'}`}>
              {item.desc}
            </div>
          </div>
        )}
      </button>
    );
  };

  /* ─── Desktop sidebar ─── */
  const DesktopSidebar = () => (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200/80 shadow-sm transition-all duration-300 ease-in-out shrink-0 ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center border-b border-slate-100 ${
          isCollapsed ? 'justify-center p-3.5' : 'justify-between px-4 py-4'
        }`}
      >
        {!isCollapsed ? (
          <>
            <Logo />
            <button
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* Collapsed — show just the icon, clicking it expands */
          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand sidebar"
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/30 hover:scale-105 transition-transform"
          >
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        {!isCollapsed && (
          <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 px-3 pb-2">
            Platform Views
          </p>
        )}
        {navItems.map((item) => (
          <NavItem key={item.id} item={item} collapsed={isCollapsed} />
        ))}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-slate-100 space-y-2">
        {/* Live sync badge */}
        {!isCollapsed ? (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="flex-1">{isConnected ? 'Live Sync Active' : 'Connecting…'}</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>
        ) : (
          <div
            className="flex justify-center py-2"
            title={isConnected ? 'Live Sync Active' : 'Connecting…'}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-100'
                  : 'bg-amber-400'
              }`}
            />
          </div>
        )}

        {/* Reset demo */}
        <button
          onClick={onResetDemo}
          title="Reset Demo Data"
          className={`w-full flex items-center justify-center gap-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 transition-all duration-150 ${
            isCollapsed ? 'py-2.5' : 'py-2 px-3'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          {!isCollapsed && <span>Reset Demo</span>}
        </button>
      </div>
    </aside>
  );

  /* ─── Mobile header bar ─── */
  const MobileHeader = () => (
    <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleNavClick('dashboard')}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm shadow-sky-500/30">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <span className="font-black text-sm text-slate-900">
            Hacker's <span className="text-orange-500">Unity</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          {isConnected ? 'LIVE' : 'SYNC'}
        </div>
        <button
          onClick={onResetDemo}
          title="Reset Demo"
          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );

  /* ─── Mobile slide-out drawer ─── */
  const MobileDrawer = () => (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => setMobileOpen(false)}
      />
      {/* Panel */}
      <div className="relative w-72 max-w-[82vw] bg-white h-full shadow-2xl flex flex-col z-10">
        {/* Drawer header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <Logo large />
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 px-3 pb-2">
            Platform Views
          </p>
          {navItems.map((item) => (
            <NavItem key={item.id} item={item} collapsed={false} />
          ))}
        </div>

        {/* Drawer footer */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="flex-1">{isConnected ? 'Live Sync Active' : 'Connecting…'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>
          <button
            onClick={onResetDemo}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo Data
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MobileHeader />
      {mobileOpen && <MobileDrawer />}
      <DesktopSidebar />
    </>
  );
};

export default Sidebar;
