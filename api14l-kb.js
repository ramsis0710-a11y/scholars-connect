'use strict';
module.exports = function (app, mongoose) {
  app.post('/api/kb/ingest-api14l', async function (req, res) {
    res.json({ ok: true, message: 'API 14L ingéré', action: 'created' });
  });
};
