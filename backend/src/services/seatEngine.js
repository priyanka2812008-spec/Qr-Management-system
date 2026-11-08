import { db } from '../db/db.js';

/**
 * Deterministic Seat Allocation Engine
 * Rules implemented from Hacker's Unity specification:
 * 1. Team members are clustered on the same table if space permits.
 * 2. If one table is full, assigns adjacent table in the same row.
 * 3. Reserved (judges/mentors) and accessibility seats are excluded from general pool.
 * 4. Deterministic check prevents any double booking.
 * 5. Supports organizer manual swap / override.
 */
export const seatEngine = {
  /**
   * Assigns an optimal seat for a participant upon check-in confirmation
   */
  assignSeatForParticipant(participant) {
    const data = db.data;
    const team = data.teams.find(t => t.id === participant.teamId);

    // If participant already has an assigned seat and is seated
    if (participant.seatId) {
      const existingSeat = this.findSeatById(participant.seatId);
      if (existingSeat) return existingSeat;
    }

    // Step 1: Check if any teammates are already seated or assigned to a table
    let preferredTableId = team?.table_id || null;
    const teammates = data.participants.filter(
      p => p.teamId === participant.teamId && p.id !== participant.id && p.seatId
    );

    if (teammates.length > 0) {
      // Find the table where most teammates are seated
      const tableCounts = {};
      teammates.forEach(tm => {
        const seat = this.findSeatById(tm.seatId);
        if (seat) {
          tableCounts[seat.tableNo] = (tableCounts[seat.tableNo] || 0) + 1;
        }
      });
      const topTable = Object.entries(tableCounts).sort((a, b) => b[1] - a[1])[0];
      if (topTable) {
        preferredTableId = topTable[0];
      }
    }

    // Step 2: Try to find a free seat on preferred table
    let assignedSeat = null;
    if (preferredTableId) {
      const preferredTable = data.tables.find(t => t.id === preferredTableId);
      if (preferredTable) {
        assignedSeat = preferredTable.seats.find(s => s.status === 'FREE' && s.type === 'general');
      }
    }

    // Step 3: If preferred table is full, check adjacent tables on the same row
    if (!assignedSeat && preferredTableId) {
      const preferredTable = data.tables.find(t => t.id === preferredTableId);
      if (preferredTable) {
        const rowTables = data.tables.filter(t => t.row === preferredTable.row && t.id !== preferredTableId);
        for (const table of rowTables) {
          const seat = table.seats.find(s => s.status === 'FREE' && s.type === 'general');
          if (seat) {
            assignedSeat = seat;
            break;
          }
        }
      }
    }

    // Step 4: If still no seat found, find any free general seat across all tables
    if (!assignedSeat) {
      for (const table of data.tables) {
        const seat = table.seats.find(s => s.status === 'FREE' && s.type === 'general');
        if (seat) {
          assignedSeat = seat;
          break;
        }
      }
    }

    if (!assignedSeat) {
      throw new Error('Hall is at maximum capacity. No free seats available in general pool.');
    }

    // Mark seat as SEATED and link participant
    assignedSeat.status = 'SEATED';
    assignedSeat.participantId = participant.id;

    // Update participant record
    participant.seatId = assignedSeat.id;
    participant.assignedSeat = assignedSeat.label;

    // Update team member arrival count
    if (team) {
      team.members_arrived = (team.members_arrived || 0) + 1;
      if (team.members_arrived >= team.size) {
        team.status = 'Seated';
      } else {
        team.status = 'Checked-in';
      }
    }

    db.save();
    return assignedSeat;
  },

  /**
   * Helper to find a seat by id across all tables
   */
  findSeatById(seatId) {
    for (const table of db.data.tables) {
      const seat = table.seats.find(s => s.id === seatId);
      if (seat) return seat;
    }
    return null;
  },

  /**
   * Swap two seats (Organizer manual override feature with audit log)
   */
  swapSeats(seatIdA, seatIdB, organizerName = 'Organizer Admin') {
    const seatA = this.findSeatById(seatIdA);
    const seatB = this.findSeatById(seatIdB);

    if (!seatA || !seatB) {
      throw new Error('One or both seats not found for swap operation');
    }

    const participantA = db.data.participants.find(p => p.id === seatA.participantId);
    const participantB = db.data.participants.find(p => p.id === seatB.participantId);

    // Swap participant references
    const tempParticipantId = seatA.participantId;
    const tempStatus = seatA.status;

    seatA.participantId = seatB.participantId;
    seatA.status = seatB.status;

    seatB.participantId = tempParticipantId;
    seatB.status = tempStatus;

    if (participantA) {
      participantA.seatId = seatB.id;
      participantA.assignedSeat = seatB.label;
    }
    if (participantB) {
      participantB.seatId = seatA.id;
      participantB.assignedSeat = seatA.label;
    }

    // Record audit log
    db.data.auditLogs.unshift({
      id: `log-swap-${Date.now()}`,
      action: 'SEAT_SWAP',
      details: `Swapped ${seatA.label} and ${seatB.label}`,
      actor: organizerName,
      timestamp: new Date().toISOString()
    });

    db.save();
    return { seatA, seatB };
  }
};

