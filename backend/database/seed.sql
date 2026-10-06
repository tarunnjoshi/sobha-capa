-- Sample data so the screens are not empty.
-- Every user's password is: password
USE sobha_capa;

INSERT INTO users (name, email, password, role) VALUES
('Admin User',   'admin@sobha.test',    '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'admin'),
('Ravi Kumar',   'supervisor@sobha.test', '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'supervisor'),
('Ankita Bhat',  'engineer@sobha.test', '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'engineer'),
('Alok Sharma',  'qcs@sobha.test',      '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'qcs'),
('Vikas Gupta',  'qaqc@sobha.test',     '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'qaqc'),
('Neha Singh',   'supervisor2@sobha.test', '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'supervisor');  -- id 6, a second site supervisor

INSERT INTO projects (name, created_at) VALUES
('Sobha Seahaven',    '2023-11-01 10:00:00'),  -- id 1
('The Crest',         '2023-11-01 10:00:00'),  -- id 2
('Sobha Hartland II', '2023-11-01 10:00:00');  -- id 3

INSERT INTO sub_activities (division, sub_division, activity, name) VALUES
('Finishing Division', 'Tile Division',    'Dry Area Floor', 'Floor Tiling'),                       -- 1
('Finishing Division', 'Plaster Division', 'Wall Finishing', 'Wall/Corner-Rush Coat Applying'),     -- 2
('Finishing Division', 'Block Division',   'Block Work',     'AAC Block Work Layout'),              -- 3
('Finishing Division', 'Paint Division',   'Ceiling Work',   'Ceiling Primer'),                     -- 4
('Finishing Division', 'Paint Division',   'Ceiling Work',   'Ceiling First coat'),                 -- 5
('Finishing Division', 'Tile Division',    'Wall Finishing', 'Wall Tile'),                          -- 6
('Finishing Division', 'Plaster Division', 'Wall Finishing', 'Wall/Corner-Corner Bead Fixing'),     -- 7
('MEP Division',       'Electrical',       'GI Box Fixing',  'GI Box Fixing'),                      -- 8
('MEP Division',       'Electrical',       'Wiring',         'Strip Fixing & Sealent Application'); -- 9

-- Rules for Sobha Seahaven (project 1)
INSERT INTO project_rules (project_id, sub_activity_id, engineer_required, qcs_required, qaqc_required, random_inspection_count) VALUES
(1, 1, 1, 1, 1, NULL),
(1, 2, 0, 1, 1, 30),
(1, 3, 1, 1, 0, NULL),
(1, 4, 1, 1, 0, NULL),
(1, 5, 0, 1, 0, NULL),
(1, 6, 0, 1, 0, NULL),
(1, 7, 0, 1, 1, 50),
(1, 8, 0, 1, 1, 20),
(1, 9, 1, 1, 1, 10);

-- The other projects start with the same rules (copied from project 1)...
INSERT INTO project_rules (project_id, sub_activity_id, engineer_required, qcs_required, qaqc_required, random_inspection_count)
SELECT p.id, r.sub_activity_id, r.engineer_required, r.qcs_required, r.qaqc_required, r.random_inspection_count
FROM project_rules r
CROSS JOIN projects p
WHERE r.project_id = 1 AND p.id IN (2, 3);

-- ...then The Crest is lighter for Floor Tiling: only QCS checks it
UPDATE project_rules SET engineer_required = 0, qaqc_required = 0, random_inspection_count = 10
WHERE project_id = 2 AND sub_activity_id = 1;

INSERT INTO capa_requests (project_id, tower, floor, unit, sub_activity_id, defect_type, defect_count, technician, status, created_by, created_at) VALUES
(1, 'Tower A', 'A - P4', 'A0402', 1, 'UCM Leak',              50, 'Akshay Jadhav', 'rejected', 2, '2023-12-01 23:00:00'),
(1, 'Tower A', 'A - P2', 'A0201', 1, 'Glass Bend',            80, 'Akshay Jadhav', 'open',     2, '2023-12-01 23:00:00'),
(2, 'Tower B', 'B - P1', 'B0105', 1, 'Wire not connected',    30, 'Rahul Verma',   'rejected', 6, '2023-12-01 23:00:00'),
(3, 'Tower A', 'A - P4', 'A0402', 8, 'Screw missing',         60, 'Akshay Jadhav', 'open',     6, '2023-12-01 23:00:00'),
(1, 'Tower C', 'C - P3', 'C0310', 1, 'FCD connection issue', 105, 'Rahul Verma',   'closed',   2, '2023-12-01 23:00:00');

-- Approval steps for each request (copied from the project's rules when it was raised)
INSERT INTO approvals (capa_request_id, level, step_order, status, approver_id, comment, acted_at) VALUES
-- Request 1: engineer ok, qcs ok, qaqc rejected
(1, 'engineer', 1, 'approved', 3, 'Request for Approval to @Alok',            '2023-12-01 11:45:00'),
(1, 'qcs',      2, 'approved', 4, 'Request for Approval to @Vikas',           '2023-12-01 11:45:00'),
(1, 'qaqc',     3, 'rejected', 5, 'Request Rejected and sent back to @Ankita', '2023-12-02 11:45:00'),
-- Request 2: engineer ok, waiting on qcs
(2, 'engineer', 1, 'approved', 3, 'Looks fine, sending to QCS', '2023-12-01 12:00:00'),
(2, 'qcs',      2, 'pending',  NULL, NULL, NULL),
(2, 'qaqc',     3, 'pending',  NULL, NULL, NULL),
-- Request 3: The Crest's Floor Tiling rule needs only QCS -> QCS rejected
(3, 'qcs',      2, 'rejected', 4, 'Wiring incomplete, please redo', '2023-12-01 13:00:00'),
-- Request 4: sub-activity 8 needs only qcs + qaqc, waiting on qcs
(4, 'qcs',      2, 'pending',  NULL, NULL, NULL),
(4, 'qaqc',     3, 'pending',  NULL, NULL, NULL),
-- Request 5: fully approved -> closed
(5, 'engineer', 1, 'approved', 3, 'OK', '2023-12-01 10:00:00'),
(5, 'qcs',      2, 'approved', 4, 'OK', '2023-12-01 11:00:00'),
(5, 'qaqc',     3, 'approved', 5, 'Closed', '2023-12-01 12:00:00');

-- Sample documents (the files are in backend/database/sample-docs/)
INSERT INTO documents (capa_request_id, original_name, file_path, mime_type, size_bytes, uploaded_by, created_at) VALUES
(1, 'ucm-leak-site-photo.png', 'database/sample-docs/ucm-leak-site-photo.png', 'image/png',       76118, 2, '2023-12-01 23:00:00'),
(1, 'inspection-report.pdf',   'database/sample-docs/inspection-report.pdf',   'application/pdf', 68782, 2, '2023-12-01 23:00:00'),
(2, 'glass-bend-photo.png',    'database/sample-docs/glass-bend-photo.png',    'image/png',       84535, 2, '2023-12-01 23:00:00');
