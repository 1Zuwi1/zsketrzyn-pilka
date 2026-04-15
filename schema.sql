-- Schemat bazy danych ligi szkolnej
-- Utwórz bazę i uruchom: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS liga_szkolna
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE liga_szkolna;

-- ============ Better Auth ============
CREATE TABLE IF NOT EXISTS user (
  id            VARCHAR(64) PRIMARY KEY,
  name          VARCHAR(190) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  emailVerified TINYINT(1) NOT NULL DEFAULT 0,
  image         TEXT NULL,
  role          VARCHAR(32) NOT NULL DEFAULT 'user',
  createdAt     DATETIME NOT NULL,
  updatedAt     DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS session (
  id        VARCHAR(64) PRIMARY KEY,
  expiresAt DATETIME NOT NULL,
  token     VARCHAR(255) NOT NULL UNIQUE,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  ipAddress VARCHAR(64) NULL,
  userAgent TEXT NULL,
  userId    VARCHAR(64) NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account (
  id                    VARCHAR(64) PRIMARY KEY,
  accountId             VARCHAR(190) NOT NULL,
  providerId            VARCHAR(64) NOT NULL,
  userId                VARCHAR(64) NOT NULL,
  accessToken           TEXT NULL,
  refreshToken          TEXT NULL,
  idToken               TEXT NULL,
  accessTokenExpiresAt  DATETIME NULL,
  refreshTokenExpiresAt DATETIME NULL,
  scope                 TEXT NULL,
  password              TEXT NULL,
  createdAt             DATETIME NOT NULL,
  updatedAt             DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS verification (
  id         VARCHAR(64) PRIMARY KEY,
  identifier VARCHAR(190) NOT NULL,
  value      TEXT NOT NULL,
  expiresAt  DATETIME NOT NULL,
  createdAt  DATETIME NOT NULL,
  updatedAt  DATETIME NOT NULL
) ENGINE=InnoDB;

-- ============ Liga ============
CREATE TABLE IF NOT EXISTS teams (
  id         VARCHAR(32) PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  short_name VARCHAR(16)  NOT NULL,
  color      VARCHAR(16)  NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS players (
  id       VARCHAR(32) PRIMARY KEY,
  team_id  VARCHAR(32) NOT NULL,
  name     VARCHAR(120) NOT NULL,
  number   INT NULL,
  position VARCHAR(40) NOT NULL DEFAULT '',
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS matches (
  id           VARCHAR(32) PRIMARY KEY,
  home_team_id VARCHAR(32) NOT NULL,
  away_team_id VARCHAR(32) NOT NULL,
  match_date   DATETIME NOT NULL,
  round_no     INT NULL,
  home_score   INT NULL,
  away_score   INT NULL,
  played       TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS match_goals (
  id         VARCHAR(32) PRIMARY KEY,
  match_id   VARCHAR(32) NOT NULL,
  player_id  VARCHAR(32) NOT NULL,
  team_id    VARCHAR(32) NOT NULL,
  minute     INT NULL,
  own_goal   TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (match_id)  REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id)   REFERENCES teams(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_matches_date  ON matches(match_date);
CREATE INDEX idx_players_team  ON players(team_id);
CREATE INDEX idx_goals_match   ON match_goals(match_id);
CREATE INDEX idx_goals_player  ON match_goals(player_id);
