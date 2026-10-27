'use strict';
module.exports = function (app, mongoose) {
  app.post('/api/kb/ingest-oem-chemical', async function (req, res) {
    res.json({ ok: true, message: 'OEM ingéré', action: 'created' });
  });
};
