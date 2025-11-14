CREATE TYPE club_roles as ENUM('Member','Admin','Owner');
CREATE TYPE media_type as ENUM('image', 'video');

CREATE TABLE tags (
	id SERIAL PRIMARY KEY,
	tag_category VARCHAR(30),
	tag_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE clubs (
	id SERIAL PRIMARY KEY,
	name VARCHAR(80) UNIQUE NOT NULL,
	description TEXT,
	avatar_url TEXT,
	banner_url TEXT,
	-- is verified?
	-- is private?
	created_at TIMESTAMPTZ DEFAULT NOW()
);

-- maybe later if we want private clubs?
-- CREATE TABLE club_join_requests (
--     id SERIAL PRIMARY KEY,
--     user_id INT REFERENCES users(id) ON DELETE CASCADE,
--     club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
--     status VARCHAR(20) DEFAULT 'pending', -- approved, rejected
--     requested_at TIMESTAMPTZ DEFAULT NOW(),
--     UNIQUE(user_id, club_id)
-- );

CREATE TABLE club_tags (
	club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
	tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY(club_id, tag_id)
);

CREATE TABLE club_members (
	id SERIAL PRIMARY KEY,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
	role club_roles DEFAULT 'Member',
	joined_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(user_id, club_id)
);

CREATE TABLE posts (
	id SERIAL PRIMARY KEY,
	user_id INT REFERENCES users(id) ON DELETE SET NULL,
	club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
	title VARCHAR(150),
	content TEXT,
	like_count INT DEFAULT 0,
	comment_count INT DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	edited_at TIMESTAMPTZ
);

CREATE TABLE post_tags (
	post_id INT REFERENCES posts(id) ON DELETE CASCADE,
	tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY(post_id, tag_id)
);

CREATE TABLE post_media (
	id SERIAL PRIMARY KEY,
	post_id INT REFERENCES posts(id) NOT NULL ON DELETE CASCADE,
	media_url TEXT NOT NULL,
	media_type media_type NOT NULL,
	sort_order SMALLINT DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_likes (
	id SERIAL PRIMARY KEY,
	post_id INT REFERENCES posts(id) ON DELETE CASCADE,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(post_id, user_id)
);

CREATE TABLE comments (
	id SERIAL PRIMARY KEY,
	post_id INT REFERENCES posts(id) ON DELETE CASCADE,
	user_id INT REFERENCES users(id) ON DELETE SET NULL,
	parent_id INT REFERENCES comments(id) ON DELETE CASCADE, -- NULL == top level
	content TEXT NOT NULL,
	like_count INT DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	edited_at TIMESTAMPTZ
);

CREATE TABLE comment_likes (
	id SERIAL PRIMARY KEY,
	comment_id INT REFERENCES comments(id) ON DELETE CASCADE,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(comment_id, user_id)
);