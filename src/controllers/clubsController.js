import pool from "../config/db.js";

// ---------------------------------------------
// 1. GET ALL CLUBS
// ---------------------------------------------
export const getAllClubs = async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id; // depending on your JWT payload

    const query = `
      SELECT
        c.id,
        c.name,
        c.avatar_url,
        c.banner_url,
        c.description,
        c.is_verified,
        COUNT(DISTINCT cm.user_id) AS member_count,
        COALESCE(
          JSON_AGG(DISTINCT t.tag_name)
          FILTER (WHERE t.tag_name IS NOT NULL),
          '[]'
        ) AS tags,
        CASE WHEN my.user_id IS NULL THEN false ELSE true END AS is_member
      FROM clubs c
      LEFT JOIN club_members cm ON cm.club_id = c.id
      LEFT JOIN club_members my ON my.club_id = c.id AND my.user_id = $1
      LEFT JOIN club_tags ct ON ct.club_id = c.id
      LEFT JOIN tags t ON t.id = ct.tag_id
      GROUP BY c.id, my.user_id
      ORDER BY c.name ASC;
    `;

    const { rows } = await pool.query(query, [userId]);
    return res.json(rows);

  } catch (err) {
    console.error("GET /clubs error:", err);
    return res.status(500).json({ error: "Failed to fetch clubs" });
  }
};

// ---------------------------------------------
// 2. GET CLUB BY ID (FULL DETAILS)
// ---------------------------------------------
export const getClubById = async (req, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    const query = `
      SELECT
  c.*,
  (
    SELECT COALESCE(json_agg(sub.tag_name), '[]'::json)
    FROM (
      SELECT DISTINCT t.tag_name
      FROM tags t
      JOIN club_tags ct2 ON ct2.tag_id = t.id
      WHERE ct2.club_id = c.id
    ) sub
  ) AS tags,
  (
    SELECT COUNT(DISTINCT cm2.user_id)
    FROM club_members cm2
    WHERE cm2.club_id = c.id
  ) AS member_count,
  (
    SELECT COALESCE(
      json_agg(
        json_build_object('user_id', sub.user_id, 'role', sub.role)
      ),
      '[]'::json
    )
    FROM (
      SELECT DISTINCT cm3.user_id, cm3.role
      FROM club_members cm3
      WHERE cm3.club_id = c.id
        AND cm3.role IN ('Admin', 'Owner')
    ) sub
  ) AS admins,
  my.role AS my_role

FROM clubs c
LEFT JOIN club_members my 
  ON my.club_id = c.id 
 AND my.user_id = $1
WHERE c.id = $2
GROUP BY c.id, my.role;
    `;

    const { rows } = await pool.query(query, [userId, clubId]);

    if (rows.length === 0)
      return res.status(404).json({ error: "Club not found" });

    return res.json(rows[0]);

  } catch (err) {
    console.error("GET /clubs/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch club" });
  }
};

// ---------------------------------------------
// 3. CREATE NEW CLUB
// ---------------------------------------------
export const createClub = async (req, res) => {
  try {
    const { name, description, avatarUrl, bannerUrl, websiteUrl, instagramUrl, discordUrl, tiktokUrl, linkedinUrl, twitterUrl, tagIds } = req.body;
    const userId = req.user.user_id || req.user.id;

    const result = await pool.query(
      `INSERT INTO clubs (name, description, avatar_url, banner_url, website_url, instagram_url, discord_url, tiktok_url, linkedin_url, twitter_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, description, avatarUrl, bannerUrl, websiteUrl, instagramUrl, discordUrl, tiktokUrl, linkedinUrl, twitterUrl]
    );

    const club = result.rows[0];

    // Add tags
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      await pool.query(
        `INSERT INTO club_tags (club_id, tag_id)
         SELECT $1, unnest($2::int[])`,
        [club.id, tagIds]
      );
    }

    // Creator becomes Owner
    await pool.query(
      `INSERT INTO club_members (user_id, club_id, role)
       VALUES ($1, $2, 'Owner')`,
      [userId, club.id]
    );

    return res.status(201).json(club);

  } catch (err) {
    console.error("POST /clubs error:", err);
    return res.status(500).json({ error: "Failed to create club" });
  }
};

// ---------------------------------------------
// 4. JOIN CLUB
// ---------------------------------------------
export const joinClub = async (req, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    await pool.query(
      `INSERT INTO club_members (user_id, club_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, club_id) DO NOTHING`,
      [userId, clubId]
    );

    return res.json({ message: "Joined club" });

  } catch (err) {
    console.error("JOIN club error:", err);
    return res.status(500).json({ error: "Failed to join club" });
  }
};

// ---------------------------------------------
// 5. LEAVE CLUB
// ---------------------------------------------
export const leaveClub = async (req, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user.user_id || req.user.id;

    // Check if user is the sole owner
    const owners = await pool.query(
      `SELECT user_id FROM club_members
       WHERE club_id = $1 AND role = 'Owner'`,
      [clubId]
    );

    const isOwner = owners.rows.some(o => o.user_id === userId);
    const onlyOwner = owners.rows.length === 1 && isOwner;

    if (onlyOwner) {
      return res.status(400).json({
        error: "Owner cannot leave without transferring ownership"
      });
    }

    await pool.query(
      `DELETE FROM club_members
       WHERE user_id = $1 AND club_id = $2`,
      [userId, clubId]
    );

    return res.json({ message: "Left club" });

  } catch (err) {
    console.error("LEAVE club error:", err);
    return res.status(500).json({ error: "Failed to leave club" });
  }
};

// ---------------------------------------------
// 6. LIST CLUB MEMBERS
// ---------------------------------------------
export const getClubMembers = async (req, res) => {
  try {
    const clubId = req.params.id;

    const { rows } = await pool.query(
      `SELECT 
          cm.user_id,
          cm.role,
          cm.joined_at,
          u.username,
          u.avatar_url
       FROM club_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.club_id = $1
       ORDER BY 
         CASE cm.role
           WHEN 'Owner' THEN 1
           WHEN 'Admin' THEN 2
           ELSE 3
         END,
         u.username ASC`,
      [clubId]
    );

    return res.json(rows);

  } catch (err) {
    console.error("GET club members error:", err);
    return res.status(500).json({ error: "Failed to fetch members" });
  }
};