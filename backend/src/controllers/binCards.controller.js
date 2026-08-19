const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { mapBinCard } = require('./_helpers');

// Read-only — rows are created/updated as a side effect of stockService.js.
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT bc.*, s.name AS store_name, i.name AS item_name
    FROM bin_cards bc
    LEFT JOIN stores s ON s.id = bc.store_id
    LEFT JOIN items i ON i.id = bc.item_id
    ORDER BY bc.bin
  `);
  res.json(rows.map(mapBinCard));
});

module.exports = { list };
