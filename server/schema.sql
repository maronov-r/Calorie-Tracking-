-- Plate's server keeps only balances and a cost ledger. Never questions, answers, photos or food logs.
-- Money is stored in millicents (1/1000 of a cent) so tiny AI costs add up exactly.

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,              -- random, made by the server
  token_hash TEXT UNIQUE NOT NULL,  -- SHA-256 of the secret the phone keeps; the secret itself is never stored
  balance INTEGER NOT NULL,         -- millicents
  created INTEGER NOT NULL          -- ms since epoch
);

CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account TEXT NOT NULL,
  t INTEGER NOT NULL,
  kind TEXT NOT NULL,               -- 'ai', 'starter', 'test_credit', 'purchase'
  model TEXT,
  in_tok INTEGER, out_tok INTEGER, cache_read INTEGER, cache_write INTEGER,
  cost INTEGER,                     -- what the AI cost the owner, millicents
  charged INTEGER NOT NULL          -- what changed on the balance, millicents (negative for use)
);
CREATE INDEX IF NOT EXISTS ledger_account ON ledger(account, t);

-- Free starter credit is limited per network per day. Stores a hash of the IP and day, never the IP.
CREATE TABLE IF NOT EXISTS signups (
  day TEXT NOT NULL,
  k TEXT NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (day, k)
);
