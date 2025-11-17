-- Drop dependent tables first (in reverse dependency order)
DROP TABLE IF EXISTS 
    refresh_tokens,
    majors,
    faculties,
    resources,
    clubs,
    club_tags,
    club_members,
    posts,
    post_tags,
    post_media,
    post_likes,
    comments,
    comment_likes,
    tags,
    users
CASCADE;

-- Drop custom enum types if they exist
DROP TYPE IF EXISTS user_study_status CASCADE;
DROP TYPE IF EXISTS user_club_status CASCADE;
DROP TYPE IF EXISTS club_roles CASCADE;
DROP TYPE IF EXISTS media_type CASCADE;

CREATE TYPE user_study_status AS ENUM ('Open to Study Groups', 'Studying Solo');
CREATE TYPE user_club_status AS ENUM ('Looking for Clubs', 'Not Joining Clubs');
CREATE TYPE club_roles as ENUM('Member','Admin','Owner');
CREATE TYPE media_type as ENUM('image', 'video');

--- USERS ---
-- FACULTIES TABLE
CREATE TABLE faculties (
	id SERIAL PRIMARY KEY,
	faculty_name VARCHAR(60) NOT NULL
);

-- MAJORS TABLE
CREATE TABLE majors (
	id SERIAL PRIMARY KEY,
	major_name VARCHAR(60) NOT NULL,
	faculty_id INT REFERENCES faculties(id)
);

-- USERS TABLE
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(50) UNIQUE NOT NULL,
	first_name VARCHAR(35) NOT NULL,
	last_name VARCHAR(35) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	bio TEXT,
	avatar_url TEXT,
	twitter_url VARCHAR(100),
	instagram_url VARCHAR(100),
	discord_url VARCHAR(100),
	linkedin_url VARCHAR(100),
	major VARCHAR(60),
	faculty VARCHAR(60),
	study_year SMALLINT,
	study_status user_study_status DEFAULT 'Open to Study Groups',
	club_status user_club_status DEFAULT 'Looking for Clubs'
);

-- REFRESH TOKENS (JWT)
CREATE TABLE refresh_tokens (
	id SERIAL PRIMARY KEY,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	token TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE resources (
	id SERIAL PRIMARY KEY,
	resource_category VARCHAR(25) NOT NULL,
	resource_name VARCHAR(50) NOT NULL,
	resource_url VARCHAR(250) NOT NULL
);

--- COMMUNITY ---
-- TAGS TABLE
CREATE TABLE tags (
	id SERIAL PRIMARY KEY,
	tag_category VARCHAR(30),
	tag_name VARCHAR(50) UNIQUE NOT NULL
);

-- CLUBS TABLE
CREATE TABLE clubs (
	id SERIAL PRIMARY KEY,
	name VARCHAR(80) UNIQUE NOT NULL,
	description TEXT,
	avatar_url TEXT,
	banner_url TEXT,
	is_verified BOOLEAN DEFAULT FALSE,-- is verified?
	-- is private?
	created_at TIMESTAMPTZ DEFAULT NOW(),
	website_url TEXT,
	instagram_url TEXT,
	discord_url TEXT,
	tiktok_url TEXT,
	linkedin_url TEXT,
	twitter_url TEXT
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

-- CLUB TAGS TABLE
CREATE TABLE club_tags (
	club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
	tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY(club_id, tag_id)
);

-- CLUB MEMBERS TABLE
CREATE TABLE club_members (
	id SERIAL PRIMARY KEY,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
	role club_roles DEFAULT 'Member',
	joined_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(user_id, club_id)
);

-- POSTS TABLE
CREATE TABLE posts (
	id SERIAL PRIMARY KEY,
	user_id INT REFERENCES users(id) ON DELETE SET NULL,
	club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
	is_from_club BOOLEAN NOT NULL DEFAULT FALSE,
	title VARCHAR(150),
	content TEXT,
	like_count INT DEFAULT 0,
	comment_count INT DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	edited_at TIMESTAMPTZ
);

-- POST TAGS TABLE
CREATE TABLE post_tags (
	post_id INT REFERENCES posts(id) ON DELETE CASCADE,
	tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY(post_id, tag_id)
);

-- POST MEDIA TABLE
CREATE TABLE post_media (
	id SERIAL PRIMARY KEY,
	post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	media_url TEXT NOT NULL,
	media_type media_type NOT NULL,
	sort_order SMALLINT DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POST LIKES TABLE
CREATE TABLE post_likes (
	id SERIAL PRIMARY KEY,
	post_id INT REFERENCES posts(id) ON DELETE CASCADE,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(post_id, user_id)
);

-- COMMENTS TABLE
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

-- COMMENT LIKES TABLE
CREATE TABLE comment_likes (
	id SERIAL PRIMARY KEY,
	comment_id INT REFERENCES comments(id) ON DELETE CASCADE,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE(comment_id, user_id)
);

-- RESET IDENTITY COUNTERS
-- (re-seeding data)
ALTER SEQUENCE resources_id_seq RESTART WITH 1;
ALTER SEQUENCE faculties_id_seq RESTART WITH 1;
ALTER SEQUENCE majors_id_seq RESTART WITH 1;
ALTER SEQUENCE refresh_tokens_id_seq RESTART WITH 1;
ALTER SEQUENCE tags_id_seq RESTART WITH 1;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE clubs_id_seq RESTART WITH 1;
ALTER SEQUENCE club_members_id_seq RESTART WITH 1;
ALTER SEQUENCE posts_id_seq RESTART WITH 1;
ALTER SEQUENCE post_media_id_seq RESTART WITH 1;
ALTER SEQUENCE post_likes_id_seq RESTART WITH 1;
ALTER SEQUENCE comments_id_seq RESTART WITH 1;
ALTER SEQUENCE comment_likes_id_seq RESTART WITH 1;
