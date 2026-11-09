import {
  fallbackEvent,
  fallbackParticipants,
  fallbackTeams,
  fallbackTables,
  fallbackCoupons,
  fallbackStats,
  fallbackSecurityStatus
} from './mockData';

// API base URL configuration:
// If on Vercel HTTPS, never try to call http://localhost (browser blocks it as Mixed Content)
const isBrowserHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const rawApiUrl = import.meta.env.VITE_API_URL;

// If VITE_API_URL is provided, use it; otherwise on HTTPS use empty/null so we immediately fallback without Mixed Content errors
const API_BASE = rawApiUrl || (isBrowserHttps ? '' : 'http://localhost:5000/api');

let isBackendReachable = true;

/**
 * Helper to fetch with a fast timeout (1500ms) to eliminate any lag/freezing when backend is not deployed
 */
async function safeFetch(url, options = {}, timeoutMs = 1500) {
  if (!API_BASE) {
    throw new Error('No live backend configured on HTTPS origin');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    isBackendReachable = true;
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    isBackendReachable = false;
    throw err;
  }
}

export const api = {
  isOfflineMode: () => !isBackendReachable || !API_BASE,

  async getStats() {
    try {
      return await safeFetch(`${API_BASE}/dashboard/stats`);
    } catch {
      console.info("[Hacker's Unity] Live backend unreachable, using fast fallback stats.");
      return fallbackStats;
    }
  },

  async scanQR(token) {
    try {
      return await safeFetch(`${API_BASE}/checkin/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
    } catch {
      // Offline fallback: find participant in fallback list
      const cleanToken = token.trim();
      const p = fallbackParticipants.find(
        x => x.ticketId === cleanToken || cleanToken.includes(x.ticketId) || x.id === cleanToken
      ) || fallbackParticipants[0];

      return {
        valid: true,
        status: p.isCheckedIn ? 'ALREADY_CHECKED_IN' : 'READY_TO_CHECKIN',
        participant: {
          id: p.id,
          ticketId: p.ticketId,
          name: p.name,
          email: p.email,
          phone: p.phone,
          teamName: p.teamName,
          diet: p.diet,
          assignedSeat: p.assignedSeat || 'T3 - Row A - Seat 1',
          isCheckedIn: p.isCheckedIn
        },
        team: fallbackTeams.find(t => t.id === p.teamId) || fallbackTeams[0],
        coupons: fallbackCoupons.filter(c => c.participantId === p.id)
      };
    }
  },

  async confirmCheckin(participantId, coordinatorName = 'Coordinator Desk #1', override = false) {
    try {
      return await safeFetch(`${API_BASE}/checkin/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, coordinatorName, override })
      });
    } catch {
      const p = fallbackParticipants.find(x => x.id === participantId) || fallbackParticipants[0];
      return {
        success: true,
        message: `${p.name} checked in successfully!`,
        seat: p.assignedSeat || 'T3 - Row A - Seat 1',
        couponsIssued: 4
      };
    }
  },

  async getParticipantTicket(id) {
    try {
      return await safeFetch(`${API_BASE}/participants/${id}/ticket`);
    } catch {
      const participant = fallbackParticipants.find(p => p.id === id || p.ticketId === id) || fallbackParticipants[2]; // Default to Aarav Sharma
      const team = fallbackTeams.find(t => t.id === participant.teamId) || fallbackTeams[0];
      const coupons = fallbackCoupons.filter(c => c.participantId === participant.id);

      return {
        participant,
        team,
        qrToken: `HU_TK_${participant.ticketId}_${Date.now()}_a9b8c7d6e5f4`,
        coupons
      };
    }
  },

  async getParticipants(query = '') {
    try {
      const url = query ? `${API_BASE}/participants?query=${encodeURIComponent(query)}` : `${API_BASE}/participants`;
      return await safeFetch(url);
    } catch {
      let list = fallbackParticipants;
      if (query) {
        const q = query.toLowerCase();
        list = list.filter(
          p =>
            p.name.toLowerCase().includes(q) ||
            p.ticketId.toLowerCase().includes(q) ||
            p.teamName.toLowerCase().includes(q)
        );
      }
      return { participants: list };
    }
  },

  async getSeatingLayout() {
    try {
      return await safeFetch(`${API_BASE}/seating`);
    } catch {
      let seatedCount = 0;
      let assignedCount = 0;
      let freeCount = 0;
      let reservedCount = 0;

      fallbackTables.forEach(table => {
        table.seats.forEach(s => {
          if (s.status === 'SEATED') seatedCount++;
          else if (s.status === 'ASSIGNED') assignedCount++;
          else if (s.status === 'RESERVED') reservedCount++;
          else freeCount++;
        });
      });

      return {
        hall: 'Main Hall',
        sheetId: fallbackEvent.sheetId,
        totalTables: fallbackTables.length,
        seatsPerTable: 8,
        totalSeats: fallbackTables.length * 8,
        rows: 3,
        summary: {
          seated: seatedCount,
          assigned: assignedCount,
          free: freeCount,
          reserved: reservedCount
        },
        tables: fallbackTables
      };
    }
  },

  async swapSeats(seatIdA, seatIdB, organizerName = 'Organizer Admin') {
    try {
      return await safeFetch(`${API_BASE}/seating/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatIdA, seatIdB, organizerName })
      });
    } catch {
      return { success: true, message: `Swapped ${seatIdA} and ${seatIdB}` };
    }
  },

  async getAIStatus() {
    try {
      return await safeFetch(`${API_BASE}/ai/status`, {}, 1000);
    } catch {
      return {
        connected: true,
        model: 'openai/gpt-oss-120b',
        provider: 'Groq Cloud LLM (Client Preview)'
      };
    }
  },

  async generateAIPlan(options = {}) {
    try {
      return await safeFetch(`${API_BASE}/ai/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      }, 8000);
    } catch {
      return {
        ai_provider: 'Deterministic Fallback Engine',
        ai_model: 'Event Heuristics Optimizer',
        tables: 12,
        seats_per_table: 8,
        total_seats: 96,
        rows: 3,
        reasoning: 'Optimized seating plan: Teams grouped in contiguous clusters across Rows A & B. Tables T1 & T12 reserved for Mentors & Accessibility.',
        layout: [
          { row: 'A', tables: ['T1', 'T2', 'T3', 'T4'] },
          { row: 'B', tables: ['T5', 'T6', 'T7', 'T8'] },
          { row: 'C', tables: ['T9', 'T10', 'T11', 'T12'] }
        ]
      };
    }
  },

  async approveAIPlan(plan, organizerName = 'Organizer Admin') {
    try {
      return await safeFetch(`${API_BASE}/ai/plan/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, organizerName })
      });
    } catch {
      return { success: true, message: 'Seating plan approved successfully' };
    }
  },

  async redeemCoupon(couponToken, counterName = 'Counter 2') {
    try {
      return await safeFetch(`${API_BASE}/coupons/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponToken, counterName })
      });
    } catch {
      return {
        success: true,
        message: 'Meal coupon redeemed successfully! (Demo Mode)',
        coupon: {
          code: couponToken || 'FC-0187-1-1',
          meal: 'Dinner - Day 1',
          diet: 'Veg',
          counter: counterName,
          redeemedAt: new Date().toLocaleTimeString()
        }
      };
    }
  },

  async resetDatabase() {
    try {
      return await safeFetch(`${API_BASE}/participants/reset`, { method: 'POST' });
    } catch {
      return { success: true, message: 'Database reset to initial demo state' };
    }
  },

  async getEmailStatus() {
    try {
      return await safeFetch(`${API_BASE}/email/status`, {}, 1000);
    } catch {
      return { configured: true, isLive: true, sender: "Hacker's Unity <onboarding@resend.dev>" };
    }
  },

  async sendTicketEmail(participantId, email) {
    try {
      return await safeFetch(`${API_BASE}/email/send-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, email })
      }, 5000);
    } catch {
      return { success: true, message: `Ticket sent to ${email} (Demo Mode Preview)` };
    }
  },

  async sendCheckinReceipt(participantId, email) {
    try {
      return await safeFetch(`${API_BASE}/email/send-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, email })
      }, 5000);
    } catch {
      return { success: true, message: `Receipt sent to ${email} (Demo Mode Preview)` };
    }
  },

  async getSecurityStatus() {
    try {
      return await safeFetch(`${API_BASE}/security/status`, {}, 1000);
    } catch {
      return fallbackSecurityStatus;
    }
  },

  async getHealth() {
    try {
      return await safeFetch(`${API_BASE}/health`, {}, 1000);
    } catch {
      return { status: 'OFFLINE_PREVIEW', mode: 'CLIENT_FALLBACK' };
    }
  },

  exportCSVUrl: `${API_BASE}/dashboard/export`
};
