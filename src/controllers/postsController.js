import pool from "../config/db.js";

// --------------------------------------------------------
// 1. CREATE POST
// --------------------------------------------------------
export const createPost = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.user_id || req.user.id;
    // Current Post type is only for a user not in a club and schema needs the false tag for it to be stored correctly
    const { clubId, title, content, postType = 'Discussion', isFromClub = false, tagIds = [], media = [] } = req.body;

    await client.query("BEGIN");

    // Insert post with post_type and is_from_club
    const postInsert = await client.query(
      `INSERT INTO posts (user_id, club_id, title, content, post_type, is_from_club)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, clubId, title, content, postType, isFromClub]
    );

    const post = postInsert.rows[0];

    // Insert tags
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      await client.query(
        `INSERT INTO post_tags (post_id, tag_id)
         SELECT $1, unnest($2::int[])`,
        [post.id, tagIds]
      );
    }

    // Insert media
    if (Array.isArray(media)) {
      for (const m of media) {
        await client.query(
          `INSERT INTO post_media (post_id, media_url, media_type, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [post.id, m.url, m.type, m.sort_order || 0]
        );
      }
    }

    await client.query("COMMIT");
    return res.status(201).json(post);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /posts error:", err.message);
    console.error("Error details:", err);
    return res.status(500).json({ error: err.message || "Failed to create post" });
  } finally {
    client.release();
  }
};

// --------------------------------------------------------
// 2. GET POST BY ID (FULL DETAILS)
// --------------------------------------------------------
export const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
        p.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'avatar_url', u.avatar_url
        ) AS author,
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
        ) AS tags,
        EXISTS (
          SELECT 1 FROM post_likes pl
          WHERE pl.user_id = $2 AND pl.post_id = p.id
        ) AS liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1
      GROUP BY p.id, u.id;
    `;

    const result = await pool.query(query, [postId, userId]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });

    res.json(result.rows[0]);

  } catch (err) {
    console.error("GET /posts/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch post" });
  }
};

// --------------------------------------------------------
// 3. GET POSTS FROM A CLUB
// --------------------------------------------------------
export const getPostsByClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
        p.*,
        u.username,
        u.avatar_url AS user_avatar,
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
      WHERE p.club_id = $1
      ORDER BY p.created_at DESC;
    `;

    const { rows } = await pool.query(query, [clubId, userId]);
    return res.json(rows);

  } catch (err) {
    console.error("GET club posts error:", err);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
};

// --------------------------------------------------------
// 4. GLOBAL FEED
// --------------------------------------------------------
export const getGlobalFeed = async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
        p.*,
        u.username,
        u.avatar_url AS user_avatar,
        c.name AS club_name,
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
        ) AS media
      FROM posts p
      JOIN users u ON u.id = p.user_id
      JOIN clubs c ON c.id = p.club_id
      ORDER BY p.created_at DESC
      LIMIT 50;
    `;

    const { rows } = await pool.query(query, [userId]);
    return res.json(rows);

  } catch (err) {
    console.error("GET global feed error:", err);
    return res.status(500).json({ error: "Failed to fetch feed" });
  }
};

// --------------------------------------------------------
// 5. LIKE POST
// --------------------------------------------------------
export const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    await pool.query(
      `INSERT INTO post_likes (post_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [postId, userId]
    );

    await pool.query(
      `UPDATE posts
       SET like_count = (
         SELECT COUNT(*) FROM post_likes WHERE post_id = $1
       )
       WHERE id = $1`,
      [postId]
    );

    res.json({ message: "Liked" });

  } catch (err) {
    console.error("POST like error:", err);
    res.status(500).json({ error: "Failed to like post" });
  }
};

// --------------------------------------------------------
// 6. UNLIKE POST
// --------------------------------------------------------
export const unlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    await pool.query(
      `DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );

    await pool.query(
      `UPDATE posts
       SET like_count = (
         SELECT COUNT(*) FROM post_likes WHERE post_id = $1
       )
       WHERE id = $1`,
      [postId]
    );

    res.json({ message: "Unliked" });

  } catch (err) {
    console.error("POST unlike error:", err);
    res.status(500).json({ error: "Failed to unlike post" });
  }
};

// --------------------------------------------------------
// 7. UPDATE POST
// --------------------------------------------------------
export const updatePost = async (req, res) => {
  const client = await pool.connect();

  try {
    const postId = req.params.id;
    const userId = req.user.user_id || req.user.id;
    const { title, content, tag_ids = [] } = req.body;

    await client.query("BEGIN");

    // Only owner may edit
    const owner = await client.query(
      `SELECT user_id FROM posts WHERE id = $1`,
      [postId]
    );

    if (owner.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });

    if (owner.rows[0].user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Not allowed" });
    }

    await client.query(
      `UPDATE posts
       SET title = $1, content = $2, edited_at = NOW()
       WHERE id = $3`,
      [title, content, postId]
    );

    await client.query(`DELETE FROM post_tags WHERE post_id = $1`, [postId]);

    if (tag_ids.length > 0) {
      await client.query(
        `INSERT INTO post_tags (post_id, tag_id)
         SELECT $1, unnest($2::int[])`,
        [postId, tag_ids]
      );
    }

    await client.query("COMMIT");
    return res.json({ message: "Updated" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH post error:", err);
    return res.status(500).json({ error: "Failed to update post" });
  } finally {
    client.release();
  }
};

// --------------------------------------------------------
// 8. DELETE POST
// --------------------------------------------------------
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    const owner = await pool.query(
      `SELECT user_id FROM posts WHERE id = $1`,
      [postId]
    );

    if (owner.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });

    if (owner.rows[0].user_id !== userId)
      return res.status(403).json({ error: "Not allowed" });

    await pool.query(`DELETE FROM posts WHERE id = $1`, [postId]);

    return res.json({ message: "Post deleted" });

  } catch (err) {
    console.error("DELETE post error:", err);
    return res.status(500).json({ error: "Failed to delete post" });
  }
};