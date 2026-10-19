-- Run this in MySQL Workbench using your existing administrator connection.
-- Replace CHANGE_ME_WITH_A_STRONG_PASSWORD before executing the user statements.
-- Existing databases and users are preserved; this does not reset user passwords.
CREATE DATABASE IF NOT EXISTS medresq
  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE USER IF NOT EXISTS 'medresq'@'localhost'
  IDENTIFIED BY 'CHANGE_ME_WITH_A_STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX
  ON medresq.* TO 'medresq'@'localhost';

-- The Java backend creates its application tables on first startup.
