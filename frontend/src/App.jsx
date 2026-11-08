import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CoordinatorScannerView } from './components/CoordinatorScannerView';
import { ParticipantTicketView } from './components/ParticipantTicketView';
import { AISeatingPlannerView } from './components/AISeatingPlannerView';
import { FoodCounterScannerView } from './components/FoodCounterScannerView';
import { SocketProvider } from './context/SocketContext';
import { api } from './services/api';

export function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const handleResetDemo = async () => {
    if (window.confirm('Reset all demo participants, seats, and coupons back to initial state?')) {
      try {
        await api.resetDatabase();
        window.location.reload();
      } catch (err) {
        alert('Reset failed: ' + err.message);
      }
    }
  };

  return (
    <SocketProvider>
      <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row text-slate-800">
        {/* Side Navigation Bar */}
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          onResetDemo={handleResetDemo}
        />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {currentView === 'dashboard' && <DashboardView onNavigate={setCurrentView} />}
            {currentView === 'scanner' && <CoordinatorScannerView />}
            {currentView === 'ticket' && <ParticipantTicketView />}
            {currentView === 'ai-planner' && <AISeatingPlannerView />}
            {currentView === 'food-counter' && <FoodCounterScannerView />}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 mt-auto">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <strong className="text-slate-600">Hacker's Unity</strong> • Hackathon QR Check-in and Smart Seating Platform
              </div>
              <div>
                Deterministic Seat Engine • Groq AI Seating Planner • Single-use Food Coupons
              </div>
            </div>
          </footer>
        </div>
      </div>
    </SocketProvider>
  );
}

export default App;
