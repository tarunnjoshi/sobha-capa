-- Sobha CAPA Workflow - database structure
-- Run this first, then seed.sql

DROP DATABASE IF EXISTS sobha_capa;
CREATE DATABASE sobha_capa;
USE sobha_capa;

-- 1. People who can log in.
--    role decides what they can do:
--    admin      -> manages Inspection Configuration
--    supervisor -> site person who finds defects and raises CAPA requests
--    engineer, qcs, qaqc -> approve / reject requests at their level
CREATE TABLE users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,          -- stored as a hash, never plain text
    role       ENUM('admin', 'supervisor', 'engineer', 'qcs', 'qaqc') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Login sessions. When a user logs in we create a random token,
--    React keeps it and sends it with every API call.
CREATE TABLE user_tokens (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    token      VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Inspection Configuration screen.
--    Each sub-activity says which levels must approve it.
CREATE TABLE sub_activities (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    division                VARCHAR(100) NOT NULL,
    sub_division            VARCHAR(100) NOT NULL,
    activity                VARCHAR(100) NOT NULL,
    name                    VARCHAR(150) NOT NULL,
    engineer_required       BOOLEAN NOT NULL DEFAULT 0,
    qcs_required            BOOLEAN NOT NULL DEFAULT 0,
    qaqc_required           BOOLEAN NOT NULL DEFAULT 0,
    random_inspection_count INT NULL
);

-- 4. CAPA Requests List screen. One row = one defect request.
CREATE TABLE capa_requests (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    project         VARCHAR(100) NOT NULL,
    tower           VARCHAR(50)  NOT NULL,
    floor           VARCHAR(50)  NOT NULL,
    unit            VARCHAR(50)  NOT NULL,
    sub_activity_id INT NOT NULL,
    defect_type     VARCHAR(150) NOT NULL,
    defect_count    INT NOT NULL DEFAULT 0,
    technician      VARCHAR(100) NOT NULL,
    status          ENUM('open', 'rejected', 'closed') NOT NULL DEFAULT 'open',
    created_by      INT NOT NULL,              -- the supervisor who raised it
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sub_activity_id) REFERENCES sub_activities(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 5. Request Detail screen (the timeline on the right).
--    One row per level the request must pass through.
--    step_order: 1 = engineer, 2 = qcs, 3 = qaqc
CREATE TABLE approvals (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    capa_request_id INT NOT NULL,
    level           ENUM('engineer', 'qcs', 'qaqc') NOT NULL,
    step_order      INT NOT NULL,
    status          ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approver_id     INT NULL,                  -- filled when someone acts
    comment         TEXT NULL,
    acted_at        TIMESTAMP NULL,
    FOREIGN KEY (capa_request_id) REFERENCES capa_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id)
);
