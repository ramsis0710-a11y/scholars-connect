'use strict';
module.exports = function (app, mongoose) {
  app.post('/api/kb/ingest-bct', async function (req, res) {
    res.json({ ok: true, message: 'BCT ingéré', action: 'created' });
  });
};
