import express from 'express';
import { db } from '../db/db.js';
import { seatEngine } from '../services/seatEngine.js';

export const seatingRouter = express.Router();

/**
 * GET /api/seating
 * Returns current seating layout, tables, seat statuses, and occupancy summary
 */
seatingRouter.get('/', (req, res) => {
  const data = db.data;
  let seatedCount = 0;
  let assignedCount = 0;
  let freeCount = 0;
  let reservedCount = 0;

  data.tables.forEach(table => {
    table.seats.forEach(s => {
      if (s.status === 'SEATED') seatedCount++;
      else if (s.status === 'ASSIGNED') assignedCount++;
      else if (s.status === 'RESERVED') reservedCount++;
      else freeCount++;
    });
  });

  return res.json({
    hall: 'Main Hall',
    sheetId: data.event.sheetId,
    totalTables: data.tables.length,
    seatsPerTable: 8,
    totalSeats: data.tables.length * 8,
    rows: 3,
    summary: {
      seated: seatedCount,
      assigned: assignedCount,
      free: freeCount,
      reserved: reservedCount
    },
    tables: data.tables
  });
});

/**
 * POST /api/seating/swap
 * Allows organizer to manually swap or reassign seats
 */
seatingRouter.post('/swap', (req, res) => {
  const { seatIdA, seatIdB, organizerName } = req.body;

  if (!seatIdA || !seatIdB) {
    return res.status(400).json({ error: 'Both seatIdA and seatIdB are required' });
  }

  try {
    const result = seatEngine.swapSeats(seatIdA, seatIdB, organizerName);

    const io = req.app.get('io');
    if (io) {
      io.emit('seating:updated', result);
    }

    return res.json({
      success: true,
      message: 'Seats swapped successfully',
      result
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

