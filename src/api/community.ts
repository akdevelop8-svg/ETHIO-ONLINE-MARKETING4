import { Router } from 'express';
import { pool } from '../db/pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
let communityTablePromise: Promise<void> | null = null;

// Ensure the table exists before handling a request. Do not fire-and-forget
// this migration at module import: a cold Vercel function could otherwise
// query the table before its creation query has finished.
function ensureCommunityTable(): Promise<void> {
  if (!pool) return Promise.resolve();
  if (!communityTablePromise) {
    communityTablePromise = pool.query(`
      CREATE TABLE IF NOT EXISTS community_messages (
        id UUID PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `).then(() => undefined).catch((error) => {
      communityTablePromise = null;
      throw error;
    });
  }
  return communityTablePromise;
}

router.use(async (_req, res, next) => {
  try {
    await ensureCommunityTable();
    next();
  } catch (error: any) {
    console.error('Failed to initialize community_messages table:', error?.message || error);
    res.status(503).json({ error: 'Community service is temporarily unavailable.' });
  }
});

router.get('/messages', async (_req, res) => {
  try {
    if (!pool) return res.status(503).json({ error: 'Database not available' });
    const result = await pool.query('SELECT * FROM community_messages ORDER BY created_at ASC LIMIT 100');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch community messages:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { userId, username, message } = req.body || {};
    if (
      typeof userId !== 'string' || !userId.trim() ||
      typeof username !== 'string' || !username.trim() ||
      typeof message !== 'string' || !message.trim()
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (message.length > 2000 || username.length > 100) {
      return res.status(400).json({ error: 'Message or username is too long.' });
    }
    if (!pool) return res.status(503).json({ error: 'Database not available' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO community_messages (id, user_id, username, message) VALUES ($1, $2, $3, $4)',
      [id, userId.trim(), username.trim(), message.trim()]
    );
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to post community message:', error?.message || error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

export const communityRouter = router;
