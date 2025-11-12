-- Drop dependent tables first (in reverse dependency order)
DROP TABLE IF EXISTS user_tags CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS majors CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;
DROP TABLE IF EXISTS resources CASCADE;

-- Drop custom enum types if they exist
DROP TYPE IF EXISTS user_study_status CASCADE;
DROP TYPE IF EXISTS user_club_status CASCADE;

CREATE TYPE user_study_status AS ENUM ('Open to Study Groups', 'Studying Solo');
CREATE TYPE user_club_status AS ENUM ('Looking for Clubs', 'Not Joining Clubs');

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

-- TAGS TABLE
CREATE TABLE tags (
	id SERIAL PRIMARY KEY,
	tag_category VARCHAR(30),
	tag_name TEXT UNIQUE NOT NULL
);

-- USERS TABLE
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(50) UNIQUE NOT NULL,
	first_name VARCHAR(35) UNIQUE NOT NULL,
	last_name VARCHAR(35) UNIQUE NOT NULL,
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

-- USER TAGS TABLE
CREATE TABLE user_tags (
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, tag_id)
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

-- RESET IDENTITY COUNTERS
-- (re-seeding data)
ALTER SEQUENCE resources_id_seq RESTART WITH 1;
ALTER SEQUENCE faculties_id_seq RESTART WITH 1;
ALTER SEQUENCE majors_id_seq RESTART WITH 1;
ALTER SEQUENCE refresh_tokens_id_seq RESTART WITH 1;
ALTER SEQUENCE tags_id_seq RESTART WITH 1;
ALTER SEQUENCE users_id_seq RESTART WITH 1;