import { Router } from 'express';
import { pool } from '../db/pg.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create table if not exists (lazy migration)
const initTable = async () => {
  if (pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_messages (
        id UUID PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => console.error('Failed to create community_messages table:', err));
  }
};
initTable();

router.get('/messages', async (req, res) => {
  try {
    if (!pool) return res.json([]);
    const result = await pool.query('SELECT * FROM community_messages ORDER BY created_at ASC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { userId, username, message } = req.body;
    if (!userId || !username || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (pool) {
      const id = uuidv4();
      await pool.query(
        'INSERT INTO community_messages (id, user_id, username, message) VALUES ($1, $2, $3, $4)',
        [id, userId, username, message]
      );
      res.json({ success: true, id });
    } else {
      res.status(500).json({ error: 'Database not available' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to post message' });
  }
});

export const communityRouter = router;
