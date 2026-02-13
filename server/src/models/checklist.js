const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const DEVICE_CHECKLISTS = {
  Phone: [
    'Screen condition (scratches, cracks)',
    'Back/housing condition',
    'Buttons functional (volume, power, home)',
    'Charging port condition',
    'Powers on',
    'Water damage indicators',
    'Touch screen responsive',
    'Front camera functional',
    'Rear camera functional',
    'Speaker functional',
    'Microphone functional',
    'Face ID / fingerprint sensor',
    'SIM tray present',
  ],
  Tablet: [
    'Screen condition (scratches, cracks)',
    'Back/housing condition',
    'Buttons functional (volume, power, home)',
    'Charging port condition',
    'Powers on',
    'Water damage indicators',
    'Touch screen responsive',
    'Front camera functional',
    'Rear camera functional',
    'Speaker functional',
    'Microphone functional',
    'Stylus/pen included (if applicable)',
  ],
  Laptop: [
    'Screen condition (scratches, cracks, dead pixels)',
    'Chassis/housing condition (dents, scratches)',
    'Keyboard functional',
    'Trackpad functional',
    'Charging port condition',
    'Powers on',
    'Battery holds charge',
    'All USB/ports functional',
    'Webcam functional',
    'Speaker functional',
    'Microphone functional',
    'Hinge condition',
    'Screen opens/closes properly',
  ],
  Desktop: [
    'Powers on',
    'Case/chassis condition (dents, scratches)',
    'All USB/ports functional',
    'Monitor output working',
    'Fan(s) running',
    'Unusual noises',
    'Power supply functional',
    'Peripherals included (keyboard, mouse)',
  ],
  'Game Console': [
    'Console body condition (scratches, dents)',
    'Powers on',
    'Disc drive functional (if applicable)',
    'Controller(s) included',
    'HDMI port condition',
    'Power port condition',
    'USB ports functional',
    'Fan running / noise level',
    'Overheating signs',
  ],
  Smartwatch: [
    'Screen condition (scratches, cracks)',
    'Band/strap condition',
    'Powers on',
    'Charging contact condition',
    'Touch screen responsive',
    'Buttons functional',
    'Water damage indicators',
    'Heart rate sensor functional',
  ],
  Other: [
    'Overall physical condition',
    'Powers on',
    'Charging/power port condition',
    'Buttons/controls functional',
    'Water damage indicators',
    'Accessories included',
  ],
};

module.exports = {
  getDeviceTypes() {
    return Object.keys(DEVICE_CHECKLISTS);
  },

  getDefaults(deviceType) {
    if (deviceType && DEVICE_CHECKLISTS[deviceType]) {
      return DEVICE_CHECKLISTS[deviceType];
    }
    return DEVICE_CHECKLISTS.Other;
  },

  async findByTicket(ticketId) {
    return db.many(
      'SELECT * FROM intake_checklist_items WHERE ticket_id = $1 ORDER BY created_at ASC',
      [ticketId]
    );
  },

  async createForTicket(ticketId, items) {
    return db.transaction(async (tx) => {
      const results = [];
      for (const item of items) {
        const id = uuidv4();
        await tx.run(
          `INSERT INTO intake_checklist_items (id, ticket_id, label, checked, note) VALUES ($1, $2, $3, $4, $5)`,
          [id, ticketId, item.label, item.checked ? 1 : 0, item.note || null]
        );
        results.push({ id, ticket_id: ticketId, label: item.label, checked: item.checked ? 1 : 0, note: item.note || null });
      }
      return results;
    });
  },

  async update(id, { checked, note }) {
    const sets = [];
    const params = [];
    let idx = 1;
    if (checked !== undefined) { sets.push(`checked = $${idx}`); params.push(checked ? 1 : 0); idx++; }
    if (note !== undefined) { sets.push(`note = $${idx}`); params.push(note); idx++; }
    if (!sets.length) return;
    params.push(id);
    await db.run(`UPDATE intake_checklist_items SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    return db.one('SELECT * FROM intake_checklist_items WHERE id = $1', [id]);
  },

  async updateWithOwnerCheck(id, storeId, { checked, note }) {
    // Verify the checklist item belongs to a ticket owned by this store
    const item = await db.one(
      `SELECT ci.id FROM intake_checklist_items ci
       JOIN tickets t ON ci.ticket_id = t.id
       WHERE ci.id = $1 AND t.store_id = $2`,
      [id, storeId]
    );
    if (!item) return null;
    return this.update(id, { checked, note });
  },
};
