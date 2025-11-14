import pool from "../config/db.js";

//
// 1. CREATE COMMENT
//
export const createComment = async (req, res) => {
  const { postId, content, parentId = null } = req.body;
  const userId = req.user.user_id || req.user.id;

  try {
    const insert = await pool.query(
      `INSERT INTO comments (post_id, user_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [postId, userId, content, parentId]
    );

    await pool.query(
      `UPDATE posts
       SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = $1)
       WHERE id = $1`,
      [postId]
    );

    return res.status(201).json(insert.rows[0]);

  } catch (err) {
    console.error("POST /comments error:", err);
    return res.status(500).json({ error: "Failed to create comment" });
  }
};


//
// 2. GET FULL NESTED COMMENT TREE
//
export const getCommentsForPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
        c.*,
        u.username,
        u.avatar_url,
        EXISTS (
          SELECT 1
          FROM comment_likes cl
          WHERE cl.comment_id = c.id AND cl.user_id = $2
        ) AS liked_by_me
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC;
    `;

    const { rows } = await pool.query(query, [postId, userId]);

    // Build tree
    const map = {};
    const roots = [];

    rows.forEach((c) => {
      map[c.id] = { ...c, children: [] };
    });

    rows.forEach((c) => {
      if (c.parent_id === null) {
        roots.push(map[c.id]);
      } else if (map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      }
    });

    return res.json(roots);

  } catch (err) {
    console.error("GET comment tree error:", err);
    return res.status(500).json({ error: "Failed to fetch comments" });
  }
};


//
// 3. LIKE COMMENT
//
export const likeComment = async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.user_id || req.user.id;

  try {
    await pool.query(
      `INSERT INTO comment_likes (comment_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [commentId, userId]
    );

    await pool.query(
      `UPDATE comments
       SET like_count = (SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1)
       WHERE id = $1`,
      [commentId]
    );

    return res.json({ message: "Comment liked" });

  } catch (err) {
    console.error("like comment error:", err);
    return res.status(500).json({ error: "Failed to like comment" });
  }
};


//
// 4. UNLIKE COMMENT
//
export const unlikeComment = async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.user_id || req.user.id;

  try {
    await pool.query(
      `DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`,
      [commentId, userId]
    );

    await pool.query(
      `UPDATE comments
       SET like_count = (SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1)
       WHERE id = $1`,
      [commentId]
    );

    return res.json({ message: "Comment unliked" });

  } catch (err) {
    console.error("unlike comment error:", err);
    return res.status(500).json({ error: "Failed to unlike comment" });
  }
};


//
// 5. UPDATE COMMENT
//
export const updateComment = async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.user_id || req.user.id;
  const { content } = req.body;

  try {
    const check = await pool.query(
      `SELECT user_id FROM comments WHERE id = $1`,
      [commentId]
    );

    if (check.rows.length === 0)
      return res.status(404).json({ error: "Comment not found" });

    if (check.rows[0].user_id !== userId)
      return res.status(403).json({ error: "Not allowed" });

    await pool.query(
      `UPDATE comments
       SET content = $1, edited_at = NOW()
       WHERE id = $2`,
      [content, commentId]
    );

    return res.json({ message: "Comment updated" });

  } catch (err) {
    console.error("update comment error:", err);
    return res.status(500).json({ error: "Failed to update comment" });
  }
};


//
// 6. DELETE COMMENT
//
export const deleteComment = async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.user_id || req.user.id;

  try {
    const check = await pool.query(
      `SELECT user_id, post_id FROM comments WHERE id = $1`,
      [commentId]
    );

    if (check.rows.length === 0)
      return res.status(404).json({ error: "Comment not found" });

    if (check.rows[0].user_id !== userId)
      return res.status(403).json({ error: "Not allowed" });

    const postId = check.rows[0].post_id;

    await pool.query(`DELETE FROM comments WHERE id = $1`, [commentId]);

    await pool.query(
      `UPDATE posts
       SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = $1)
       WHERE id = $1`,
      [postId]
    );

    return res.json({ message: "Comment deleted" });

  } catch (err) {
    console.error("delete comment error:", err);
    return res.status(500).json({ error: "Failed to delete comment" });
  }
};