-- Sample data so the screens are not empty.
-- Every user's password is: password
USE sobha_capa;

INSERT INTO users (name, email, password, role) VALUES
('Admin User',   'admin@sobha.test',    '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'admin'),
('Ravi Kumar',   'supervisor@sobha.test', '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'supervisor'),
('Ankita Bhat',  'engineer@sobha.test', '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'engineer'),
('Alok Sharma',  'qcs@sobha.test',      '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'qcs'),
('Vikas Gupta',  'qaqc@sobha.test',     '$2y$10$1pnbdVSzlNRlJLuN/iryY.YKtpHYSdJZeV0p86h2JtK./1gFATC7e', 'qaqc');

INSERT INTO sub_activities (division, sub_division, activity, name, engineer_required, qcs_required, qaqc_required, random_inspection_count) VALUES
('Finishing Division', 'Tile Division',    'Dry Area Floor', 'Floor Tiling',                   1, 1, 1, NULL),
('Finishing Division', 'Plaster Division', 'Wall Finishing', 'Wall/Corner-Rush Coat Applying', 0, 1, 1, 30),
('Finishing Division', 'Block Division',   'Block Work',     'AAC Block Work Layout',          1, 1, 0, NULL),
('Finishing Division', 'Paint Division',   'Ceiling Work',   'Ceiling Primer',                 1, 1, 0, NULL),
('Finishing Division', 'Paint Division',   'Ceiling Work',   'Ceiling First coat',             0, 1, 0, NULL),
('Finishing Division', 'Tile Division',    'Wall Finishing', 'Wall Tile',                      0, 1, 0, NULL),
('Finishing Division', 'Plaster Division', 'Wall Finishing', 'Wall/Corner-Corner Bead Fixing', 0, 1, 1, 50),
('MEP Division',       'Electrical',       'GI Box Fixing',  'GI Box Fixing',                  0, 1, 1, 20),
('MEP Division',       'Electrical',       'Wiring',         'Strip Fixing & Sealent Application', 1, 1, 1, 10);

INSERT INTO capa_requests (project, tower, floor, unit, sub_activity_id, defect_type, defect_count, technician, status, created_by, created_at) VALUES
('Sobha Seahaven',   'Tower A', 'A - P4', 'A0402', 1, 'UCM Leak',              50, 'Akshay Jadhav', 'rejected',  2, '2023-12-01 23:00:00'),
('Sobha Seahaven',   'Tower A', 'A - P2', 'A0201', 1, 'Glass Bend',            80, 'Akshay Jadhav', 'open',      2, '2023-12-01 23:00:00'),
('The Crest',        'Tower B', 'B - P1', 'B0105', 1, 'Wire not connected',    30, 'Rahul Verma',   'rejected',  2, '2023-12-01 23:00:00'),
('Sobha Hartland II','Tower A', 'A - P4', 'A0402', 8, 'Screw missing',         60, 'Akshay Jadhav', 'open',      2, '2023-12-01 23:00:00'),
('Sobha Seahaven',   'Tower C', 'C - P3', 'C0310', 1, 'FCD connection issue', 105, 'Rahul Verma',   'closed',    2, '2023-12-01 23:00:00');

-- Approval steps for each request (based on the sub-activity's required levels)
INSERT INTO approvals (capa_request_id, level, step_order, status, approver_id, comment, acted_at) VALUES
-- Request 1: engineer ok, qcs ok, qaqc rejected
(1, 'engineer', 1, 'approved', 3, 'Request for Approval to @Alok',            '2023-12-01 11:45:00'),
(1, 'qcs',      2, 'approved', 4, 'Request for Approval to @Vikas',           '2023-12-01 11:45:00'),
(1, 'qaqc',     3, 'rejected', 5, 'Request Rejected and sent back to @Ankita', '2023-12-02 11:45:00'),
-- Request 2: engineer ok, waiting on qcs
(2, 'engineer', 1, 'approved', 3, 'Looks fine, sending to QCS', '2023-12-01 12:00:00'),
(2, 'qcs',      2, 'pending',  NULL, NULL, NULL),
(2, 'qaqc',     3, 'pending',  NULL, NULL, NULL),
-- Request 3: engineer rejected
(3, 'engineer', 1, 'rejected', 3, 'Wiring incomplete', '2023-12-01 13:00:00'),
(3, 'qcs',      2, 'pending',  NULL, NULL, NULL),
(3, 'qaqc',     3, 'pending',  NULL, NULL, NULL),
-- Request 4: sub-activity 8 needs only qcs + qaqc, waiting on qcs
(4, 'qcs',      2, 'pending',  NULL, NULL, NULL),
(4, 'qaqc',     3, 'pending',  NULL, NULL, NULL),
-- Request 5: fully approved -> closed
(5, 'engineer', 1, 'approved', 3, 'OK', '2023-12-01 10:00:00'),
(5, 'qcs',      2, 'approved', 4, 'OK', '2023-12-01 11:00:00'),
(5, 'qaqc',     3, 'approved', 5, 'Closed', '2023-12-01 12:00:00');
