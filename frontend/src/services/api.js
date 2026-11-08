const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = {
  async getStats() {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  async scanQR(token) {
    const res = await fetch(`${API_BASE}/checkin/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return res.json();
  },

  async confirmCheckin(participantId, coordinatorName = 'Coordinator Desk #1', override = false) {
    const res = await fetch(`${API_BASE}/checkin/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, coordinatorName, override })
    });
    return res.json();
  },

  async getParticipantTicket(id) {
    const res = await fetch(`${API_BASE}/participants/${id}/ticket`);
    if (!res.ok) throw new Error('Failed to fetch participant ticket');
    return res.json();
  },

  async getParticipants(query = '') {
    const url = query ? `${API_BASE}/participants?query=${encodeURIComponent(query)}` : `${API_BASE}/participants`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch participants');
    return res.json();
  },

  async getSeatingLayout() {
    const res = await fetch(`${API_BASE}/seating`);
    if (!res.ok) throw new Error('Failed to fetch seating layout');
    return res.json();
  },

  async swapSeats(seatIdA, seatIdB, organizerName = 'Organizer Admin') {
    const res = await fetch(`${API_BASE}/seating/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatIdA, seatIdB, organizerName })
    });
    return res.json();
  },

  async getAIStatus() {
    try {
      const res = await fetch(`${API_BASE}/ai/status`);
      return res.json();
    } catch {
      return { connected: false, model: 'openai/gpt-oss-120b' };
    }
  },

  async generateAIPlan(options = {}) {
    const res = await fetch(`${API_BASE}/ai/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return res.json();
  },

  async approveAIPlan(plan, organizerName = 'Organizer Admin') {
    const res = await fetch(`${API_BASE}/ai/plan/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, organizerName })
    });
    return res.json();
  },

  async redeemCoupon(couponToken, counterName = 'Counter 2') {
    const res = await fetch(`${API_BASE}/coupons/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponToken, counterName })
    });
    return res.json();
  },

  async resetDatabase() {
    const res = await fetch(`${API_BASE}/participants/reset`, {
      method: 'POST'
    });
    return res.json();
  },

  async getEmailStatus() {
    try {
      const res = await fetch(`${API_BASE}/email/status`);
      return res.json();
    } catch {
      return { configured: false };
    }
  },

  async sendTicketEmail(participantId, email) {
    const res = await fetch(`${API_BASE}/email/send-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, email })
    });
    return res.json();
  },

  async sendCheckinReceipt(participantId, email) {
    const res = await fetch(`${API_BASE}/email/send-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, email })
    });
    return res.json();
  },

  async getSecurityStatus() {
    try {
      const res = await fetch(`${API_BASE}/security/status`);
      return res.json();
    } catch {
      return { success: false };
    }
  },

  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.json();
    } catch {
      return { status: 'OFFLINE' };
    }
  },

  exportCSVUrl: `${API_BASE}/dashboard/export`
};

