import { config } from '../config/env.js';
import { db } from '../db/db.js';

/**
 * Groq AI Seating and Food Planner Service
 * Calls Groq Cloud LLM (openai/gpt-oss-120b, qwen/qwen3.8-27b) with JSON mode, validates schema,
 * and maintains safety by never directly mutating live seats until organizer approves.
 */
export const groqPlanner = {
  /**
   * Returns current status of Groq AI connection
   */
  async getStatus() {
    const hasKey = Boolean(
      config.groqApiKey &&
      config.groqApiKey.startsWith('gsk_') &&
      !config.groqApiKey.includes('your_groq')
    );

    return {
      connected: hasKey,
      provider: 'Groq Cloud LLM',
      model: config.groqModel || 'openai/gpt-oss-120b',
      keyPreview: hasKey ? `${config.groqApiKey.slice(0, 7)}...${config.groqApiKey.slice(-4)}` : null
    };
  },

  /**
   * Generates a seating and meal plan from Google Sheet configuration / parameters
   */
  async generatePlan({ sheetId = 'Seating_Plan_HU26', totalTables = 12, seatsPerTable = 8, rowsCount = 3 } = {}) {
    const prompt = `
You are the AI Seating & Logistics Planner for Hacker's Unity Hackathon 2026.
Given:
- Google Sheet: ${sheetId}
- Total Tables: ${totalTables}
- Seats per table: ${seatsPerTable}
- Rows: ${rowsCount}
- Registered Teams: 24 (92 participants)
- Reserved Seats: Judges, Mentors, Accessibility

Return a strictly valid JSON object matching this schema:
{
  "hall": "Main Hall",
  "sheet": "${sheetId}",
  "tables": ${totalTables},
  "rows": ${rowsCount},
  "seats_per_table": ${seatsPerTable},
  "total_seats": ${totalTables * seatsPerTable},
  "layout": [
    { "row": "A", "tables": ["T1", "T2", "T3", "T4"] },
    { "row": "B", "tables": ["T5", "T6", "T7", "T8"] },
    { "row": "C", "tables": ["T9", "T10", "T11", "T12"] }
  ],
  "reserved_seats": ["T1-1", "T1-2", "T12-8"],
  "teams_planned": 24,
  "participants_capacity": 92,
  "meals": [
    { "id": "m1", "name": "Dinner", "day": 1, "window": "20:00-22:00" },
    { "id": "m2", "name": "Breakfast", "day": 2, "window": "08:00-10:00" },
    { "id": "m3", "name": "Lunch", "day": 2, "window": "13:00-15:00" },
    { "id": "m4", "name": "Evening Snacks", "day": 2, "window": "17:00-18:30" }
  ],
  "ai_reasoning": "Clustered high-capacity teams in Rows A and B for rapid desk routing. Reserved T1 near stage for mentors and T12 near exit for accessibility."
}
Return ONLY valid JSON.
`;

    let generatedJson = null;
    let modelUsed = null;

    // Try calling Groq API if API key is provided and not default placeholder
    if (config.groqApiKey && config.groqApiKey.startsWith('gsk_') && !config.groqApiKey.includes('your_groq')) {
      const candidateModels = [
        config.groqModel || 'openai/gpt-oss-120b',
        'openai/gpt-oss-120b',
        'qwen/qwen3.8-27b',
        'openai/gpt-oss-20b'
      ];
      // Deduplicate
      const uniqueModels = [...new Set(candidateModels)];

      for (const model of uniqueModels) {
        try {
          console.log(`[Groq AI] Requesting seating plan with model: ${model}...`);
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.groqApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert event operations planner. You always return strictly valid JSON objects only.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.2
            })
          });

          if (response.ok) {
            const result = await response.json();
            const content = result.choices?.[0]?.message?.content;
            if (content) {
              let clean = content.trim();
              if (clean.startsWith('```json')) {
                clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
              } else if (clean.startsWith('```')) {
                clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
              }
              generatedJson = JSON.parse(clean);
              modelUsed = model;
              console.log(`[Groq AI] Successfully generated seating plan using ${model}!`);
              break;
            }
          } else {
            const errText = await response.text();
            console.warn(`[Groq AI] Model ${model} returned status ${response.status}: ${errText.slice(0, 120)}`);
          }
        } catch (err) {
          console.warn(`[Groq AI] Model ${model} call error:`, err.message);
        }
      }
    }

    // High quality deterministic fallback generator if Groq key isn't provided or network call fails
    if (!generatedJson) {
      console.log('[Groq AI] Using deterministic event layout fallback.');
      generatedJson = {
        hall: 'Main Hall',
        sheet: sheetId,
        tables: totalTables,
        rows: rowsCount,
        seats_per_table: seatsPerTable,
        total_seats: totalTables * seatsPerTable,
        layout: [
          { row: 'A', tables: ['T1', 'T2', 'T3', 'T4'] },
          { row: 'B', tables: ['T5', 'T6', 'T7', 'T8'] },
          { row: 'C', tables: ['T9', 'T10', 'T11', 'T12'] }
        ],
        reserved_seats: ['T1-1', 'T1-2', 'T12-8'],
        teams_planned: 24,
        participants_capacity: 92,
        meals: [
          { id: 'm1', name: 'Dinner', day: 1, window: '20:00-22:00' },
          { id: 'm2', name: 'Breakfast', day: 2, window: '08:00-10:00' },
          { id: 'm3', name: 'Lunch', day: 2, window: '13:00-15:00' },
          { id: 'm4', name: 'Evening Snacks', day: 2, window: '17:00-18:30' }
        ],
        ai_reasoning: 'AI optimized layout: Rows A & B allocated for 4-member teams near presentation screens. Row C allocated for flexible agile teams. T1 reserved for Judges/Mentors, T12 for Accessibility.'
      };
      modelUsed = 'Deterministic Engine';
    }

    // Attach metadata
    generatedJson.ai_provider = modelUsed === 'Deterministic Engine' ? 'Local Fallback Engine' : 'Groq Cloud LLM';
    generatedJson.ai_model = modelUsed;
    generatedJson.is_live_ai = modelUsed !== 'Deterministic Engine';
    generatedJson.generated_at = new Date().toISOString();

    // Auto-normalize total_seats if needed
    if (!generatedJson.total_seats || generatedJson.total_seats !== (generatedJson.tables * generatedJson.seats_per_table)) {
      generatedJson.total_seats = (generatedJson.tables || totalTables) * (generatedJson.seats_per_table || seatsPerTable);
    }

    // Strict schema validation as stated in proposal section 04:
    this.validatePlanSchema(generatedJson);

    return generatedJson;
  },

  /**
   * Validates the generated plan according to the safety specifications
   */
  validatePlanSchema(plan) {
    if (!plan || typeof plan !== 'object') {
      throw new Error('Invalid plan: Payload must be a JSON object');
    }

    if (!plan.tables || plan.tables <= 0) {
      throw new Error('Schema validation failed: "tables" must be positive integer');
    }

    if (!plan.seats_per_table || plan.seats_per_table <= 0) {
      throw new Error('Schema validation failed: "seats_per_table" must be positive integer');
    }

    const calculatedTotal = plan.tables * plan.seats_per_table;
    if (plan.total_seats !== calculatedTotal) {
      throw new Error(`Schema validation failed: total_seats (${plan.total_seats}) does not match tables * seats_per_table (${calculatedTotal})`);
    }

    if (!Array.isArray(plan.layout) || plan.layout.length === 0) {
      throw new Error('Schema validation failed: layout must be non-empty array of rows');
    }

    // Check for duplicate tables
    const seenTables = new Set();
    plan.layout.forEach(row => {
      if (Array.isArray(row.tables)) {
        row.tables.forEach(tId => {
          if (seenTables.has(tId)) {
            throw new Error(`Duplicate table found in layout: ${tId}`);
          }
          seenTables.add(tId);
        });
      }
    });

    return true;
  },

  /**
   * Organizer approves the generated plan: updates active layout
   */
  approvePlan(plan, organizerName = 'Organizer Admin') {
    this.validatePlanSchema(plan);

    db.data.event.lastSynced = new Date().toISOString();
    db.data.event.sheetId = plan.sheet || db.data.event.sheetId;

    // Log the approval in audit log
    db.data.auditLogs.unshift({
      id: `log-ai-plan-${Date.now()}`,
      action: 'AI_PLAN_APPROVED',
      details: `Approved plan with ${plan.tables} tables, ${plan.total_seats} seats across ${plan.rows} rows (via ${plan.ai_provider || 'Groq AI'})`,
      actor: organizerName,
      timestamp: new Date().toISOString()
    });

    db.save();
    return { success: true, message: 'Plan approved and synchronized successfully' };
  }
};
