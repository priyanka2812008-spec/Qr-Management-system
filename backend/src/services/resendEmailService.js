import { config } from '../config/env.js';

/**
 * Resend Email Service for Hacker's Unity Platform
 * Sends entry tickets, QR passes, and check-in confirmation receipts via Resend REST API
 */
export const resendEmailService = {
  /**
   * Returns current Resend integration status
   */
  getStatus() {
    const hasKey = Boolean(
      config.resendApiKey &&
      config.resendApiKey.startsWith('re_') &&
      !config.resendApiKey.includes('sample_api_key')
    );

    return {
      configured: hasKey,
      sender: config.resendFromEmail,
      keyPreview: hasKey ? `${config.resendApiKey.slice(0, 7)}...${config.resendApiKey.slice(-4)}` : null
    };
  },

  /**
   * Raw email sender via Resend API
   */
  async sendEmail({ to, subject, html, text }) {
    if (!config.resendApiKey || !config.resendApiKey.startsWith('re_')) {
      return {
        success: false,
        error: 'Resend API key is not configured in environment variables'
      };
    }

    try {
      console.log(`[Resend Email] Sending email "${subject}" to ${to}...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.resendFromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text: text || subject
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`[Resend Email] Email sent successfully! ID: ${data.id}`);
        return {
          success: true,
          id: data.id,
          recipient: to
        };
      } else {
        console.warn(`[Resend Email] Resend API error (${response.status}):`, data);
        return {
          success: false,
          statusCode: response.status,
          error: data.message || 'Failed to send email via Resend'
        };
      }
    } catch (err) {
      console.error('[Resend Email] Network/Fetch error:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  },

  /**
   * Sends official digital ticket with QR and coupons to participant
   */
  async sendTicketEmail({ to, participant, qrToken, coupons = [] }) {
    const recipientEmail = to || participant.email;
    if (!recipientEmail) {
      return { success: false, error: 'Recipient email is required' };
    }

    const couponsHtml = coupons.length > 0
      ? coupons.map(c => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${c.mealName}</td>
            <td style="padding: 10px 12px; color: #64748b; font-size: 13px;">${c.window}</td>
            <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #0284c7;">${c.couponCode}</td>
            <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: ${c.status === 'VALID' ? '#059669' : '#64748b'};">${c.status}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8;">Coupons generated at desk check-in</td></tr>';

    const seatBadge = participant.assignedSeat
      ? `<div style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 6px 14px; border-radius: 8px; font-weight: bold; font-family: monospace; font-size: 15px; margin-top: 6px;">${participant.assignedSeat}</div>`
      : `<span style="color: #64748b; font-size: 13px;">Assigned instantly at check-in desk</span>`;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrToken || participant.ticketId)}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Hacker's Unity Ticket</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Hacker's <span style="color: #fdba74;">Unity</span></h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9;">Official Hackathon Entry Ticket</p>
        </div>

        <!-- Ticket Body -->
        <div style="padding: 32px 24px;">
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Hello <strong>${participant.name}</strong>,</p>
          <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #64748b;">
            Your registration for <strong>Hacker's Unity Hackathon 2026</strong> is confirmed! Present the digital QR code below at the reception desk for instant badge printing and desk seating.
          </p>

          <!-- QR Code Section -->
          <div style="text-align: center; background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
            <img src="${qrUrl}" alt="Ticket QR Code" width="180" height="180" style="display: block; margin: 0 auto; border-radius: 8px; border: 4px solid #ffffff;" />
            <div style="margin-top: 12px; font-family: monospace; font-size: 16px; font-weight: bold; color: #1e293b; letter-spacing: 1px;">
              ${participant.ticketId}
            </div>
            <div style="margin-top: 4px;">
              <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px;">
                ${participant.slotStatus === 'CONFIRMED' ? 'SLOT CONFIRMED' : 'WAITLIST PENDING'}
              </span>
            </div>
          </div>

          <!-- Participant & Team Details -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; width: 35%;">Participant:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${participant.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Team Name:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #0284c7;">${participant.teamName || 'Solo'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Diet Preference:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${participant.diet || 'Standard'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Assigned Seat:</td>
              <td style="padding: 8px 0;">${seatBadge}</td>
            </tr>
          </table>

          <!-- Meal Coupons -->
          <h3 style="margin: 24px 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">
            Included Meal Coupons
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 8px 12px;">Meal</th>
                <th style="padding: 8px 12px;">Time Window</th>
                <th style="padding: 8px 12px;">Code</th>
                <th style="padding: 8px 12px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${couponsHtml}
            </tbody>
          </table>

          <div style="margin-top: 28px; padding: 14px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; color: #166534;">
            💡 <strong>Fast Track Tip:</strong> Have this QR code ready on your phone when arriving at the entrance gate for quick scan & entry.
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Hacker's Unity Platform • Hackathon QR Check-in & Smart Seating</p>
          <p style="margin: 4px 0 0 0;">This email was sent via Resend API</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `🎟️ Your Hacker's Unity 2026 Ticket - ${participant.name} (${participant.ticketId})`,
      html,
      text: `Hello ${participant.name},\n\nYour ticket for Hacker's Unity 2026 is confirmed!\nTicket ID: ${participant.ticketId}\nTeam: ${participant.teamName}\nAssigned Seat: ${participant.assignedSeat || 'Assigned at check-in'}\n\nPresent this code at the registration desk.`
    });
  },

  /**
   * Sends check-in receipt upon desk confirmation
   */
  async sendCheckinReceiptEmail({ to, participant, assignedSeat, coupons = [] }) {
    const recipientEmail = to || participant.email;
    if (!recipientEmail) {
      return { success: false, error: 'Recipient email is required' };
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 28px;">
        <h2 style="color: #0284c7; margin-top: 0;">🎉 Check-in Confirmed!</h2>
        <p style="color: #334155; font-size: 15px;">Welcome to Hacker's Unity Hackathon, <strong>${participant.name}</strong>!</p>
        
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 18px 0; text-align: center;">
          <div style="font-size: 12px; color: #0369a1; text-transform: uppercase; font-weight: bold;">Your Assigned Seat</div>
          <div style="font-size: 24px; font-weight: 800; font-family: monospace; color: #0c4a6e; margin-top: 4px;">
            ${assignedSeat?.label || participant.assignedSeat || 'Main Hall'}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Table ${assignedSeat?.tableId || 'Assigned'}</div>
        </div>

        <p style="color: #64748b; font-size: 13px;">Your food coupons have been activated in the system. Use your digital ticket to redeem meals at the food counters.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <div style="font-size: 11px; color: #94a3b8; text-align: center;">
          Hacker's Unity Platform • Delivered via Resend
        </div>
      </div>
    </body>
    </html>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `✅ Check-in Confirmed - Welcome to Hacker's Unity! (Seat: ${assignedSeat?.label || participant.assignedSeat})`,
      html,
      text: `Welcome ${participant.name}!\nYour check-in is confirmed.\nAssigned Seat: ${assignedSeat?.label || participant.assignedSeat}`
    });
  }
};

