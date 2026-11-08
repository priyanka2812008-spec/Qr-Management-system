import express from 'express';
import { groqPlanner } from '../services/groqPlanner.js';
import { db } from '../db/db.js';

export const aiRouter = express.Router();

/**
 * GET /api/ai/status
 * Returns current status of Groq AI connection, active model, and capabilities
 */
aiRouter.get('/status', async (req, res) => {
  try {
    const status = await groqPlanner.getStatus();
    return res.json({
      success: true,
      ...status
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/ai/plan
 * Generates or regenerates an AI seating and food plan using Groq LLM
 */
aiRouter.post('/plan', async (req, res) => {
  try {
    const { sheetId, tables, seatsPerTable, rows } = req.body;
    const plan = await groqPlanner.generatePlan({
      sheetId: sheetId || db.data.event.sheetId,
      totalTables: tables || 12,
      seatsPerTable: seatsPerTable || 8,
      rowsCount: rows || 3
    });

    return res.json({
      success: true,
      plan
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/ai/plan/approve
 * Organizer approves the draft plan
 */
aiRouter.post('/plan/approve', (req, res) => {
  try {
    const { plan, organizerName } = req.body;
    if (!plan) {
      return res.status(400).json({ error: 'Plan payload is required' });
    }

    const result = groqPlanner.approvePlan(plan, organizerName);

    const io = req.app.get('io');
    if (io) {
      io.emit('plan:approved', { plan, event: db.data.event });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
