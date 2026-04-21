-- Schemat bazy danych ligi szkolnej
-- Utwórz bazę i uruchom: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS liga_szkolna
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE liga_szkolna;

-- ============ Better Auth ============
CREATE TABLE IF NOT EXISTS user (
  id                 VARCHAR(64) PRIMARY KEY,
  name               VARCHAR(190) NOT NULL,
  email              VARCHAR(190) NOT NULL UNIQUE,
  emailVerified      TINYINT(1) NOT NULL DEFAULT 0,
  image              TEXT NULL,
  role               VARCHAR(32) NOT NULL DEFAULT 'user',
  teamId             VARCHAR(32) NULL,
  mustChangePassword TINYINT(1) NOT NULL DEFAULT 0,
  createdAt          DATETIME NOT NULL,
  updatedAt          DATETIME NOT NULL
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

-- ============ Składy meczów (Lineups) ============
-- Jedna para (match_id, team_id) = jeden skład. Pola startingXI/substitutes
-- są trzymane w JSON-ie dla prostoty - to nie jest relacyjnie rozbite,
-- ponieważ dane składu nie są używane do agregacji.
CREATE TABLE IF NOT EXISTS match_lineups (
  id            VARCHAR(32) PRIMARY KEY,
  match_id      VARCHAR(32) NOT NULL,
  team_id       VARCHAR(32) NOT NULL,
  formation     VARCHAR(16) NOT NULL DEFAULT '4-4-2',
  starting_xi   JSON NOT NULL,
  substitutes   JSON NOT NULL,
  coach         VARCHAR(120) NULL,
  updated_by    VARCHAR(64) NULL,
  updated_at    DATETIME NOT NULL,
  locked_at     DATETIME NULL,
  UNIQUE KEY uq_match_team (match_id, team_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id)  REFERENCES teams(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_lineups_match ON match_lineups(match_id);

-- ============ Migracja dla istniejących baz ============
-- Bezpieczne do wielokrotnego uruchamiania z powyższą definicją.
-- MySQL nie ma IF NOT EXISTS dla ADD COLUMN, więc używamy procedury.
DROP PROCEDURE IF EXISTS add_user_columns;
DELIMITER $$
CREATE PROCEDURE add_user_columns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'teamId'
  ) THEN
    ALTER TABLE user ADD COLUMN teamId VARCHAR(32) NULL AFTER role;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'mustChangePassword'
  ) THEN
    ALTER TABLE user ADD COLUMN mustChangePassword TINYINT(1) NOT NULL DEFAULT 0 AFTER teamId;
  END IF;
END$$
DELIMITER ;
CALL add_user_columns();
DROP PROCEDURE IF EXISTS add_user_columns;
