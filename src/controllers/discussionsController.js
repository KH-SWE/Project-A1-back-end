import pool from "../config/db.js";

// --------------------------------------------------------
// 1. GET ALL DISCUSSIONS (Personal posts only)
// --------------------------------------------------------
export const getAllDiscussions = async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
        p.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'avatar_url', u.avatar_url
        ) AS author,
        EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1
        ) AS liked_by_me,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pm.id,
            'url', pm.media_url,
            'type', pm.media_type,
            'sort_order', pm.sort_order
          ) ORDER BY pm.sort_order)
          FROM post_media pm
          WHERE pm.post_id = p.id),
          '[]'
        ) AS media,
        COALESCE(
          (SELECT json_agg(t.tag_name)
           FROM post_tags pt
           JOIN tags t ON t.id = pt.tag_id
           WHERE pt.post_id = p.id),
          '[]'
        ) AS tags
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.is_from_club = false AND p.post_type = 'Discussion'
      ORDER BY p.created_at DESC
      LIMIT 50;
    `;

    const { rows } = await pool.query(query, [userId]);
    return res.json(rows);

  } catch (err) {
    console.error("GET all discussions error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to fetch discussions" });
  }
};

// --------------------------------------------------------
// 2. GET DISCUSSION BY ID (Full details)
// --------------------------------------------------------
export const getDiscussionById = async (req, res) => {
  try {
    const discussionId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
        p.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'avatar_url', u.avatar_url
        ) AS author,
        EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2
        ) AS liked_by_me,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pm.id,
            'url', pm.media_url,
            'type', pm.media_type,
            'sort_order', pm.sort_order
          ) ORDER BY pm.sort_order)
          FROM post_media pm
          WHERE pm.post_id = p.id),
          '[]'
        ) AS media,
        COALESCE(
          (SELECT json_agg(t.tag_name)
           FROM post_tags pt
           JOIN tags t ON t.id = pt.tag_id
           WHERE pt.post_id = p.id),
          '[]'
        ) AS tags
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1 AND p.is_from_club = false AND p.post_type = 'Discussion'
      GROUP BY p.id, u.id;
    `;

    const { rows } = await pool.query(query, [discussionId, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Discussion not found" });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error("GET discussion by id error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to fetch discussion" });
  }
};

// --------------------------------------------------------
// 3. GET DISCUSSION COMMENTS
// --------------------------------------------------------
export const getDiscussionComments = async (req, res) => {
  try {
    const discussionId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
        c.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'avatar_url', u.avatar_url
        ) AS author,
        EXISTS(
          SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $2
        ) AS liked_by_me
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC;
    `;

    const { rows } = await pool.query(query, [discussionId, userId]);
    return res.json(rows);

  } catch (err) {
    console.error("GET discussion comments error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to fetch comments" });
  }
};

// --------------------------------------------------------
// 4. GET DISCUSSIONS BY USER
// --------------------------------------------------------
export const getDiscussionsByUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
        p.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'avatar_url', u.avatar_url
        ) AS author,
        EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2
        ) AS liked_by_me,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pm.id,
            'url', pm.media_url,
            'type', pm.media_type,
            'sort_order', pm.sort_order
          ) ORDER BY pm.sort_order)
          FROM post_media pm
          WHERE pm.post_id = p.id),
          '[]'
        ) AS media
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1 AND p.is_from_club = false AND p.post_type = 'Discussion'
      ORDER BY p.created_at DESC
      LIMIT 50;
    `;

    const { rows } = await pool.query(query, [targetUserId, userId]);
    return res.json(rows);

  } catch (err) {
    console.error("GET user discussions error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to fetch user discussions" });
  }
};

// --------------------------------------------------------
// 5. SEARCH DISCUSSIONS
// --------------------------------------------------------
export const searchDiscussions = async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    const userId = req.user.user_id || req.user.id;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const query = `
      SELECT
        p.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'avatar_url', u.avatar_url
        ) AS author,
        EXISTS(
          SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2
        ) AS liked_by_me,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pm.id,
            'url', pm.media_url,
            'type', pm.media_type,
            'sort_order', pm.sort_order
          ) ORDER BY pm.sort_order)
          FROM post_media pm
          WHERE pm.post_id = p.id),
          '[]'
        ) AS media
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.is_from_club = false 
        AND p.post_type = 'Discussion'
        AND (p.title ILIKE $1 OR p.content ILIKE $1)
      ORDER BY p.created_at DESC
      LIMIT 50;
    `;

    const searchPattern = `%${searchQuery}%`;
    const { rows } = await pool.query(query, [searchPattern, userId]);
    return res.json(rows);

  } catch (err) {
    console.error("Search discussions error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to search discussions" });
  }
};
