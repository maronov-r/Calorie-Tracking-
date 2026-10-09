// Plate's AI server: holds the owner's Anthropic key, checks each person's prepaid balance,
// forwards their request to Claude and charges what it actually cost (times a markup).
// Privacy: request and response bodies pass straight through. Nothing about them is stored or logged.

// Dollars per million tokens (Claude API pricing). Cache writes cost 1.25× input.
const PRICES = {
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cacheRead: 0.01 },
};
const BETAS = new Set(['server-side-fallback-2026-07-01']);
const MAX_TOKENS = 16000;
const HOLD = 10_000; // 10¢ set aside while a request runs, so parallel requests can't overspend
const MC = 1000; // millicents per cent
const SIGNUPS_PER_DAY = 5; // free starter credit per network per day

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    let res;
    try {
      if (url.pathname === '/account' && req.method === 'POST') res = await createAccount(req, env);
      else if (url.pathname === '/account' && req.method === 'GET') res = await getAccount(req, env);
      else if (url.pathname === '/account' && req.method === 'DELETE') res = await deleteAccount(req, env);
      else if (url.pathname === '/test/add-credit' && req.method === 'POST' && env.TEST_MODE === 'true') res = await testCredit(req, env);
      else if (url.pathname === '/v1/messages' && req.method === 'POST') res = await proxy(req, env, url);
      else res = error(404, 'not_found_error', 'Not found.');
    } catch (err) {
      res = error(500, 'api_error', 'Something went wrong on the Plate server.');
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

// ---- Helpers ----

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });
// Errors in Anthropic's shape, so the app's SDK reports them normally.
const error = (status, type, message) => json({ type: 'error', error: { type, message } }, status);

function corsHeaders(req, env) {
  const origin = req.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': req.headers.get('access-control-request-headers') || 'content-type, x-api-key',
    'access-control-expose-headers': 'x-plate-balance, x-plate-charged',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return 'plate_' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// The phone sends its secret as x-api-key (that's where the Anthropic SDK puts it) or as a Bearer token.
async function authed(req, env) {
  const token = req.headers.get('x-api-key') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token.startsWith('plate_')) return null;
  return env.DB.prepare('SELECT id, balance FROM accounts WHERE token_hash = ?').bind(await sha256(token)).first();
}

const markup = (env) => Math.max(1, parseFloat(env.MARKUP) || 1.8);
const cents = (mc) => Math.round(mc / 10) / 100; // millicents → cents, 2 decimals

function costOf(model, usage = {}) {
  const p = PRICES[model] || PRICES['claude-opus-5-5'];
  const dollars = ((usage.input_tokens || 0) * p.in + (usage.cache_creation_input_tokens || 0) * p.in * 1.25
    + (usage.cache_read_input_tokens || 0) * p.cacheRead + (usage.output_tokens || 0) * p.out) / 1e6;
  return Math.ceil(dollars * 100 * MC);
}

// ---- Accounts ----

async function createAccount(req, env) {
  const day = new Date().toISOString().slice(0, 10);
  const k = await sha256(`${req.headers.get('cf-connecting-ip') || 'unknown'}|${day}|${env.IP_SALT || ''}`);
  await env.DB.prepare('DELETE FROM signups WHERE day < ?').bind(day).run();
  const row = await env.DB.prepare('INSERT INTO signups (day, k, n) VALUES (?, ?, 1) ON CONFLICT(day, k) DO UPDATE SET n = n + 1 RETURNING n').bind(day, k).first();
  const starter = row.n <= SIGNUPS_PER_DAY ? Math.round((parseFloat(env.STARTER_CENTS) || 0) * MC) : 0;

  const id = crypto.randomUUID();
  const token = randomToken();
  const now = Date.now();
  const stmts = [env.DB.prepare('INSERT INTO accounts (id, token_hash, balance, created) VALUES (?, ?, ?, ?)').bind(id, await sha256(token), starter, now)];
  if (starter) stmts.push(env.DB.prepare('INSERT INTO ledger (account, t, kind, charged) VALUES (?, ?, ?, ?)').bind(id, now, 'starter', starter));
  await env.DB.batch(stmts);
  return json({ token, balance_cents: cents(starter), markup: markup(env), test_mode: env.TEST_MODE === 'true' });
}

async function getAccount(req, env) {
  const acct = await authed(req, env);
  if (!acct) return error(401, 'authentication_error', 'Unknown Plate account.');
  return json({ balance_cents: cents(acct.balance), markup: markup(env), test_mode: env.TEST_MODE === 'true' });
}

async function deleteAccount(req, env) {
  const acct = await authed(req, env);
  if (!acct) return error(401, 'authentication_error', 'Unknown Plate account.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ledger WHERE account = ?').bind(acct.id),
    env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(acct.id),
  ]);
  return json({ deleted: true });
}

// Test mode only: pretend someone paid. Turned off by setting TEST_MODE to anything but "true".
async function testCredit(req, env) {
  const acct = await authed(req, env);
  if (!acct) return error(401, 'authentication_error', 'Unknown Plate account.');
  const body = await req.json().catch(() => ({}));
  const add = Math.round(Math.min(5000, Math.max(0, +body.cents || 0)) * MC);
  await env.DB.batch([
    env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(add, acct.id),
    env.DB.prepare('INSERT INTO ledger (account, t, kind, charged) VALUES (?, ?, ?, ?)').bind(acct.id, Date.now(), 'test_credit', add),
  ]);
  return json({ balance_cents: cents(acct.balance + add) });
}

// ---- The AI pass-through ----

async function proxy(req, env, url) {
  const acct = await authed(req, env);
  if (!acct) return error(401, 'authentication_error', 'Unknown Plate account.');
  if (!env.ANTHROPIC_API_KEY) return error(503, 'api_error', 'The Plate server is not set up yet.');

  let body;
  try { body = await req.json(); } catch { return error(400, 'invalid_request_error', 'Bad request.'); }
  // Only what Plate's own features use: known models, a token limit, our own tools, no streaming.
  if (!PRICES[body.model]) return error(400, 'invalid_request_error', 'That model is not available.');
  if (body.stream) return error(400, 'invalid_request_error', 'Streaming is not available.');
  if (!(body.max_tokens > 0 && body.max_tokens <= MAX_TOKENS)) return error(400, 'invalid_request_error', 'max_tokens is out of range.');
  if ((body.tools || []).some((t) => t.type && t.type !== 'custom')) return error(400, 'invalid_request_error', 'That tool is not available.');
  const betas = (req.headers.get('anthropic-beta') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (betas.some((b) => !BETAS.has(b))) return error(400, 'invalid_request_error', 'That feature is not available.');
  if (url.search && url.search !== '?beta=true') return error(400, 'invalid_request_error', 'Bad request.');

  // Set aside the hold; this fails when the balance is too low.
  const held = await env.DB.prepare('UPDATE accounts SET balance = balance - ?1 WHERE id = ?2 AND balance >= ?1').bind(HOLD, acct.id).run();
  if (!held.meta.changes) return error(402, 'billing_error', 'Out of coach credit. Add credit to keep using AI.');

  let settled = false;
  try {
    const upstream = await fetch((env.UPSTREAM || 'https://api.anthropic.com') + '/v1/messages' + url.search, {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': req.headers.get('anthropic-version') || '2023-06-01',
        'content-type': 'application/json',
        ...(betas.length ? { 'anthropic-beta': betas.join(',') } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();

    if (!upstream.ok) {
      await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(HOLD, acct.id).run();
      settled = true;
      // A problem with the owner's key is the server's problem, not the person's.
      if (upstream.status === 401 || upstream.status === 403 || (upstream.status === 400 && /credit balance/i.test(text))) {
        let why = '';
        try { why = JSON.parse(text).error.type; } catch {}
        if (/credit balance/i.test(text)) why = 'owner_out_of_credit';
        return error(503, 'api_error', `The coach is unavailable right now. Try again later. (${upstream.status} ${why})`);
      }
      return new Response(text, { status: upstream.status, headers: { 'content-type': 'application/json' } });
    }

    const msg = JSON.parse(text);
    const u = msg.usage || {};
    const cost = costOf(msg.model || body.model, u);
    const charged = Math.ceil(cost * markup(env));
    const [, , after] = await env.DB.batch([
      env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(HOLD - charged, acct.id),
      env.DB.prepare('INSERT INTO ledger (account, t, kind, model, in_tok, out_tok, cache_read, cache_write, cost, charged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(acct.id, Date.now(), 'ai', msg.model || body.model, u.input_tokens || 0, u.output_tokens || 0, u.cache_read_input_tokens || 0, u.cache_creation_input_tokens || 0, cost, -charged),
      env.DB.prepare('SELECT balance FROM accounts WHERE id = ?').bind(acct.id),
    ]);
    settled = true;
    return new Response(text, {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-plate-balance': String(cents(after.results[0].balance)), 'x-plate-charged': String(cents(charged)) },
    });
  } finally {
    if (!settled) await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(HOLD, acct.id).run();
  }
}
