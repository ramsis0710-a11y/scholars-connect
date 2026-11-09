// mail-agent.js - Agent multi-comptes (OVH, Gmail, Yahoo) en IMAP/SMTP, sans Azure
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const PORT = process.env.MAIL_AGENT_PORT || 3001;
const AUTO_SEND = process.env.MAIL_AUTO_SEND === 'true';
const LOOKBACK_DAYS = parseInt(process.env.MAIL_LOOKBACK_DAYS || '2', 10);
const MAX_PER_CYCLE = parseInt(process.env.MAIL_MAX_PER_CYCLE || '15', 10);
const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const ACCOUNTS = [
  {
    id: 'ovh', label: 'MBA-Consult (OVH)',
    user: process.env.MAIL_USER || 'mba@mba-consult.tn',
    pass: process.env.MAIL_PASSWORD,
    imapHost: process.env.MAIL_IMAP_HOST || 'ssl0.ovh.net', imapPort: 993,
    smtpHost: process.env.MAIL_SMTP_HOST || 'ssl0.ovh.net', smtpPort: 465
  },
  {
    id: 'gmail', label: 'Gmail',
    user: process.env.GMAIL_USER || 'ramsis0710@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD,
    imapHost: 'imap.gmail.com', imapPort: 993,
    smtpHost: 'smtp.gmail.com', smtpPort: 465
  },
  {
    id: 'yahoo', label: 'Yahoo',
    user: process.env.YAHOO_USER || 'mba.consult@yahoo.fr',
    pass: process.env.YAHOO_APP_PASSWORD,
    imapHost: 'imap.mail.yahoo.com', imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com', smtpPort: 465
  }
].filter(a => a.pass).map(a => ({ ...a, pass: a.pass.replace(/\s+/g, '') }));

const ALL_USERS = ACCOUNTS.map(a => a.user.toLowerCase());
const state = {};
ACCOUNTS.forEach(a => { state[a.id] = { user: a.user, connected: false, lastCheck: null, processed: 0, drafts: 0, lastError: null, recent: [] }; });

// ---------- IA ----------
function buildPrompt(from, subject, content) {
  return `Tu es l'assistant de MBA-CONSULT. Voici un email recu :
Expediteur : ${from}
Sujet : ${subject}
Contenu : ${content.substring(0, 3000)}

Tache :
1. Resume cet email en 2 phrases.
2. Determine s'il necessite une reponse directe de ma part (true/false).
3. Si true, redige un projet de reponse professionnel dans la langue de l'email.

Reponds UNIQUEMENT au format JSON strict :
{"resume":"...","actionnable":true,"brouillon":"..."}`;
}

async function askAI(prompt) {
  if (GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 1000, temperature: 0.2 })
      });
      const d = await r.json();
      if (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) return d.choices[0].message.content;
    } catch (e) { console.error('[Mail Agent] Groq:', e.message); }
  }
  if (GEMINI_KEY) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const d = await r.json();
      const t = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text;
      if (t) return t;
    } catch (e) { console.error('[Mail Agent] Gemini:', e.message); }
  }
  return '';
}

function parseJSON(text) {
  try { const m = text.match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : text); } catch (e) { return null; }
}

// ---------- Brouillon / envoi ----------
function buildReply(acc, original, text) {
  const addr = original.from && original.from.value && original.from.value[0] && original.from.value[0].address;
  const subject = /^re:/i.test(original.subject || '') ? original.subject : `Re: ${original.subject || ''}`;
  return { from: acc.user, to: addr, subject, text, inReplyTo: original.messageId, references: original.messageId };
}

async function saveDraft(acc, client, original, text) {
  const composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const info = await composer.sendMail(buildReply(acc, original, text));
  const boxes = await client.list();
  const d = boxes.find(b => b.specialUse === '\\Drafts')
    || boxes.find(b => /^(drafts|draft|brouillons)$/i.test(b.name))
    || boxes.find(b => /draft|brouillon/i.test(b.path));
  const path = d ? d.path : 'Drafts';
  await client.append(path, info.message, ['\\Draft']);
  return path;
}

async function sendReply(acc, original, text) {
  const t = nodemailer.createTransport({
    host: acc.smtpHost, port: acc.smtpPort, secure: acc.smtpPort === 465,
    auth: { user: acc.user, pass: acc.pass }
  });
  await t.sendMail(buildReply(acc, original, text));
}

// ---------- Traitement ----------
async function processMessage(acc, client, uid) {
  const msg = await client.fetchOne(uid, { source: true }, { uid: true });
  if (!msg || !msg.source) return;
  const parsed = await simpleParser(msg.source);
  const from = (parsed.from && parsed.from.value && parsed.from.value[0] && parsed.from.value[0].address) || 'inconnu';

  if (ALL_USERS.includes(from.toLowerCase())) return;
  if (/no-?reply|mailer-daemon|notification|newsletter/i.test(from)) return;
  if (parsed.headers && parsed.headers.has('list-unsubscribe')) return;

  const subject = parsed.subject || '(sans sujet)';
  const content = (parsed.text || (parsed.html ? String(parsed.html).replace(/<[^>]+>/g, ' ') : '')).replace(/\s+/g, ' ').trim();

  const result = parseJSON(await askAI(buildPrompt(from, subject, content)));
  if (!result) return;

  const s = state[acc.id];
  console.log(`[${acc.id}] ${from} | ${subject} | ${result.resume} | Actionnable: ${result.actionnable}`);
  s.processed++;
  s.recent.unshift({ date: new Date().toISOString(), from, subject, resume: result.resume, actionnable: !!result.actionnable });
  s.recent = s.recent.slice(0, 20);

  if (result.actionnable && result.brouillon) {
    if (AUTO_SEND) {
      await sendReply(acc, parsed, result.brouillon);
      console.log(`[${acc.id}] Reponse envoyee a ${from}`);
    } else {
      const p = await saveDraft(acc, client, parsed, result.brouillon);
      console.log(`[${acc.id}] Brouillon enregistre dans "${p}"`);
    }
    s.drafts++;
  }
}

// ---------- Surveillance IMAP par compte ----------
async function watchAccount(acc) {
  const done = new Set();
  let busy = false;

  async function checkNew(client) {
    if (busy) return;
    busy = true;
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
      const uids = (await client.search({ seen: false, since }, { uid: true })) || [];
      const fresh = uids.filter(u => !done.has(u)).slice(-MAX_PER_CYCLE);
      for (const uid of fresh) {
        done.add(uid);
        try { await processMessage(acc, client, uid); }
        catch (e) { state[acc.id].lastError = e.message; console.error(`[${acc.id}] Erreur:`, e.message); }
      }
      state[acc.id].lastCheck = new Date().toISOString();
    } finally { busy = false; }
  }

  while (true) {
    const client = new ImapFlow({
      host: acc.imapHost, port: acc.imapPort, secure: true,
      auth: { user: acc.user, pass: acc.pass }, logger: false
    });
    client.on('error', e => { state[acc.id].lastError = e.message; });
    try {
      await client.connect();
      state[acc.id].connected = true;
      console.log(`[${acc.id}] Connecte a ${acc.imapHost}`);
      const lock = await client.getMailboxLock('INBOX');
      try {
        await checkNew(client);
        client.on('exists', () => { checkNew(client).catch(e => console.error(`[${acc.id}]`, e.message)); });
        const end = Date.now() + 25 * 60 * 1000;
        while (client.usable && Date.now() < end) { await client.idle(); }
      } finally { lock.release(); }
      await client.logout();
    } catch (e) {
      state[acc.id].lastError = e.message;
      console.error(`[${acc.id}] Connexion perdue:`, e.message);
    }
    state[acc.id].connected = false;
    await new Promise(r => setTimeout(r, 15000));
  }
}

// ---------- Demarrage ----------
const app = express();
app.get('/api/mail/status', (req, res) => res.json(state));
app.listen(PORT, () => console.log(`[Mail Agent] Port ${PORT} | Comptes actifs : ${ACCOUNTS.map(a => a.id).join(', ') || 'aucun'}`));
ACCOUNTS.forEach(a => watchAccount(a));