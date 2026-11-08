import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../data/db.json');

// Initial seed generator
function createInitialSeed() {
  const tables = [];
  const rows = ['A', 'B', 'C'];
  // 12 tables (4 per row)
  for (let t = 1; t <= 12; t++) {
    const tableId = `T${t}`;
    const rowIndex = Math.floor((t - 1) / 4);
    const rowName = rows[rowIndex];
    const seats = [];

    for (let s = 1; s <= 8; s++) {
      const seatId = `${tableId}-Seat-${s}`;
      const seatLabel = `${tableId} - Row ${rowName} - Seat ${s}`;

      let type = 'general';
      let status = 'FREE'; // FREE, ASSIGNED, SEATED, RESERVED
      let participantId = null;

      // Reserved special seats from PDF
      if ((tableId === 'T1' && s <= 2) || (tableId === 'T12' && s === 8)) {
        type = tableId === 'T12' ? 'accessible' : 'reserved';
        status = 'RESERVED';
      }

      seats.push({
        id: seatId,
        tableNo: tableId,
        row: rowName,
        seatNumber: s,
        label: seatLabel,
        type,
        status,
        participantId
      });
    }

    tables.push({
      id: tableId,
      name: `Table ${t}`,
      row: rowName,
      capacity: 8,
      seats
    });
  }

  const teams = [
    {
      id: 'team-1',
      name: 'CodeNova',
      size: 4,
      members_arrived: 2,
      slot_status: 'CONFIRMED',
      table_id: 'T3',
      row: 'B',
      status: 'Checked-in'
    },
    {
      id: 'team-2',
      name: 'ByteForce',
      size: 4,
      members_arrived: 2,
      slot_status: 'CONFIRMED',
      table_id: 'T5',
      row: 'A',
      status: 'Checked-in'
    },
    {
      id: 'team-3',
      name: 'DevDynasty',
      size: 4,
      members_arrived: 1,
      slot_status: 'PENDING',
      table_id: 'T1',
      row: 'C',
      status: 'Pending'
    },
    {
      id: 'team-4',
      name: 'CyberKnights',
      size: 3,
      members_arrived: 0,
      slot_status: 'CONFIRMED',
      table_id: 'T2',
      row: 'A',
      status: 'Pending'
    },
    {
      id: 'team-5',
      name: 'CloudArchitects',
      size: 4,
      members_arrived: 4,
      slot_status: 'CONFIRMED',
      table_id: 'T4',
      row: 'A',
      status: 'Seated'
    },
    {
      id: 'team-6',
      name: 'QuantumLeap',
      size: 4,
      members_arrived: 3,
      slot_status: 'CONFIRMED',
      table_id: 'T6',
      row: 'B',
      status: 'Checked-in'
    }
  ];

  const participants = [
    {
      id: 'p-187',
      ticketId: 'HU-26-0187',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phone: '+91 98765 43210',
      teamId: 'team-1',
      teamName: 'CodeNova',
      diet: 'Veg',
      slotStatus: 'CONFIRMED',
      isCheckedIn: false,
      checkedInAt: null,
      seatId: null,
      assignedSeat: null
    },
    {
      id: 'p-188',
      ticketId: 'HU-26-0188',
      name: 'Meera Kapoor',
      email: 'meera.k@example.com',
      phone: '+91 98765 43211',
      teamId: 'team-1',
      teamName: 'CodeNova',
      diet: 'Non-Veg',
      slotStatus: 'CONFIRMED',
      isCheckedIn: false,
      checkedInAt: null,
      seatId: null,
      assignedSeat: null
    },
    {
      id: 'p-185',
      ticketId: 'HU-26-0185',
      name: 'Priya Nair',
      email: 'priya.n@example.com',
      phone: '+91 98765 43212',
      teamId: 'team-1',
      teamName: 'CodeNova',
      diet: 'Veg',
      slotStatus: 'CONFIRMED',
      isCheckedIn: true,
      checkedInAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      seatId: 'T3-Seat-5',
      assignedSeat: 'T3 - Row B - Seat 5'
    },
    {
      id: 'p-186',
      ticketId: 'HU-26-0186',
      name: 'Dev Patel',
      email: 'dev.p@example.com',
      phone: '+91 98765 43213',
      teamId: 'team-1',
      teamName: 'CodeNova',
      diet: 'Jain',
      slotStatus: 'CONFIRMED',
      isCheckedIn: true,
      checkedInAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      seatId: 'T3-Seat-6',
      assignedSeat: 'T3 - Row B - Seat 6'
    },
    {
      id: 'p-189',
      ticketId: 'HU-26-0189',
      name: 'Rohan Prakash',
      email: 'rohan.p@example.com',
      phone: '+91 98765 43214',
      teamId: 'team-2',
      teamName: 'ByteForce',
      diet: 'Veg',
      slotStatus: 'CONFIRMED',
      isCheckedIn: false,
      checkedInAt: null,
      seatId: null,
      assignedSeat: null
    },
    {
      id: 'p-190',
      ticketId: 'HU-26-0190',
      name: 'Isha Verma',
      email: 'isha.v@example.com',
      phone: '+91 98765 43215',
      teamId: 'team-2',
      teamName: 'ByteForce',
      diet: 'Jain',
      slotStatus: 'CONFIRMED',
      isCheckedIn: false,
      checkedInAt: null,
      seatId: null,
      assignedSeat: null
    },
    {
      id: 'p-194',
      ticketId: 'HU-26-0194',
      name: 'Tanmay Roy',
      email: 'tanmay.r@example.com',
      phone: '+91 98765 43216',
      teamId: 'team-2',
      teamName: 'ByteForce',
      diet: 'Non-Veg',
      slotStatus: 'CONFIRMED',
      isCheckedIn: true,
      checkedInAt: new Date(Date.now() - 3600000).toISOString(),
      seatId: 'T5-Seat-2',
      assignedSeat: 'T5 - Row A - Seat 2'
    },
    {
      id: 'p-195',
      ticketId: 'HU-26-0195',
      name: 'Aryan Singh',
      email: 'aryan.s@example.com',
      phone: '+91 98765 43217',
      teamId: 'team-2',
      teamName: 'ByteForce',
      diet: 'Veg',
      slotStatus: 'CONFIRMED',
      isCheckedIn: true,
      checkedInAt: new Date(Date.now() - 1800000).toISOString(),
      seatId: 'T5-Seat-3',
      assignedSeat: 'T5 - Row A - Seat 3'
    },
    {
      id: 'p-191',
      ticketId: 'HU-26-0191',
      name: 'Kabir Joshi',
      email: 'kabir.j@example.com',
      phone: '+91 98765 43218',
      teamId: 'team-3',
      teamName: 'DevDynasty',
      diet: 'Non-Veg',
      slotStatus: 'CONFIRMED',
      isCheckedIn: true,
      checkedInAt: new Date(Date.now() - 900000).toISOString(),
      seatId: 'T1-Seat-7',
      assignedSeat: 'T1 - Row C - Seat 7'
    },
    {
      id: 'p-192',
      ticketId: 'HU-26-0192',
      name: 'Sneha Reddy',
      email: 'sneha.r@example.com',
      phone: '+91 98765 43219',
      teamId: 'team-3',
      teamName: 'DevDynasty',
      diet: 'Veg',
      slotStatus: 'PENDING', // To demonstrate "Valid - Slot not confirmed"
      isCheckedIn: false,
      checkedInAt: null,
      seatId: null,
      assignedSeat: null
    },
    {
      id: 'p-193',
      ticketId: 'HU-26-0193',
      name: 'Vikram Rao',
      email: 'vikram.r@example.com',
      phone: '+91 98765 43220',
      teamId: 'team-4',
      teamName: 'CyberKnights',
      diet: 'Veg',
      slotStatus: 'CONFIRMED',
      isCheckedIn: false,
      checkedInAt: null,
      seatId: null,
      assignedSeat: null
    }
  ];

  // Mark already occupied seats in tables
  tables.forEach(table => {
    table.seats.forEach(seat => {
      const occupant = participants.find(p => p.seatId === seat.id);
      if (occupant) {
        seat.status = 'SEATED';
        seat.participantId = occupant.id;
      }
    });
  });

  const meals = [
    {
      id: 'meal-1',
      name: 'Dinner - Day 1',
      day: 1,
      windowStart: '20:00',
      windowEnd: '22:00',
      status: 'ACTIVE',
      counters: ['Counter 1', 'Counter 2', 'Counter 3']
    },
    {
      id: 'meal-2',
      name: 'Breakfast - Day 2',
      day: 2,
      windowStart: '08:00',
      windowEnd: '10:00',
      status: 'UPCOMING',
      counters: ['Counter 1', 'Counter 2']
    },
    {
      id: 'meal-3',
      name: 'Lunch - Day 2',
      day: 2,
      windowStart: '13:00',
      windowEnd: '15:00',
      status: 'UPCOMING',
      counters: ['Counter 1', 'Counter 2', 'Counter 3']
    },
    {
      id: 'meal-4',
      name: 'Evening Snacks - Day 2',
      day: 2,
      windowStart: '17:00',
      windowEnd: '18:30',
      status: 'UPCOMING',
      counters: ['Counter 1', 'Counter 2']
    }
  ];

  // Generate coupons for participants who already checked in
  const coupons = [];
  participants.forEach(p => {
    if (p.isCheckedIn) {
      meals.forEach((meal, idx) => {
        const couponCode = `FC-${p.ticketId.split('-')[2]}-${meal.day}-${idx + 1}`;
        const isRedeemed = meal.id === 'meal-1' && p.id === 'p-185'; // simulate 1 redeemed
        coupons.push({
          id: `cp-${couponCode}`,
          couponCode,
          participantId: p.id,
          participantName: p.name,
          diet: p.diet,
          mealId: meal.id,
          mealName: meal.name,
          day: meal.day,
          window: `${meal.windowStart} - ${meal.windowEnd}`,
          status: isRedeemed ? 'REDEEMED' : (meal.id === 'meal-1' ? 'VALID' : 'UPCOMING'),
          redeemedAt: isRedeemed ? new Date(Date.now() - 1200000).toISOString() : null,
          redeemedBy: isRedeemed ? 'Counter 2' : null
        });
      });
    }
  });

  const auditLogs = [
    {
      id: 'log-1',
      action: 'CHECKIN_CONFIRMED',
      participant: 'Priya Nair (HU-26-0185)',
      team: 'CodeNova',
      seat: 'T3 - Row B - Seat 5',
      actor: 'Coordinator Desk #1',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'log-2',
      action: 'CHECKIN_CONFIRMED',
      participant: 'Dev Patel (HU-26-0186)',
      team: 'CodeNova',
      seat: 'T3 - Row B - Seat 6',
      actor: 'Coordinator Desk #2',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString()
    },
    {
      id: 'log-3',
      action: 'COUPON_REDEEMED',
      participant: 'Priya Nair (HU-26-0185)',
      team: 'CodeNova',
      details: 'Dinner - Day 1 at Counter 2 (Veg)',
      actor: 'Food Staff Counter 2',
      timestamp: new Date(Date.now() - 1200000).toISOString()
    },
    {
      id: 'log-4',
      action: 'CHECKIN_CONFIRMED',
      participant: 'Tanmay Roy (HU-26-0194)',
      team: 'ByteForce',
      seat: 'T5 - Row A - Seat 2',
      actor: 'Coordinator Desk #1',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'log-5',
      action: 'CHECKIN_CONFIRMED',
      participant: 'Kabir Joshi (HU-26-0191)',
      team: 'DevDynasty',
      seat: 'T1 - Row C - Seat 7',
      actor: 'Coordinator Desk #3',
      timestamp: new Date(Date.now() - 900000).toISOString()
    }
  ];

  return {
    event: {
      id: 'hu-hackathon-2026',
      name: "Hacker's Unity Hackathon 2026 - Day 1",
      status: 'LIVE',
      venue: 'Main Tech Auditorium, Convention Center',
      sheetId: 'Seating_Plan_HU26',
      lastSynced: new Date().toISOString()
    },
    tables,
    teams,
    participants,
    meals,
    coupons,
    auditLogs
  };
}

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = createInitialSeed();
        this.save();
      }
    } catch (err) {
      console.warn('Initializing fresh seed database due to read error:', err.message);
      this.data = createInitialSeed();
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database:', err);
    }
  }

  reset() {
    this.data = createInitialSeed();
    this.save();
    return this.data;
  }
}

export const db = new Database();

