<?php
// GET /api/capa-request.php?id=1
// One request with its approval timeline (Request Detail screen).

require __DIR__ . '/../helpers.php';

$user = require_login();

$id = $_GET['id'] ?? null;
if (!$id) {
    json_response(['error' => 'id is required'], 422);
}

// The request + its sub-activity info + who raised it
$stmt = db()->prepare(
    'SELECT r.*, p.name AS project, s.division, s.sub_division, s.activity, s.name AS sub_activity,
            u.name AS created_by_name
     FROM capa_requests r
     JOIN projects p ON p.id = r.project_id
     JOIN sub_activities s ON s.id = r.sub_activity_id
     JOIN users u ON u.id = r.created_by
     WHERE r.id = ?'
);
$stmt->execute([$id]);
$request = $stmt->fetch();

if (!$request) {
    json_response(['error' => 'Request not found'], 404);
}

// The approval steps, in order, with the approver's name (if someone acted)
$stmt = db()->prepare(
    'SELECT a.id, a.level, a.step_order, a.status, a.comment, a.acted_at,
            u.name AS approver_name
     FROM approvals a
     LEFT JOIN users u ON u.id = a.approver_id
     WHERE a.capa_request_id = ?
     ORDER BY a.step_order'
);
$stmt->execute([$id]);
$approvals = $stmt->fetchAll();

// Attached documents (photos / PDFs)
$stmt = db()->prepare(
    'SELECT id, original_name, mime_type, size_bytes, created_at
     FROM documents
     WHERE capa_request_id = ?
     ORDER BY id'
);
$stmt->execute([$id]);

$request['approvals'] = $approvals;
$request['documents'] = $stmt->fetchAll();
$request['current_level'] = current_level($request['status'], $approvals);
$request['my_turn'] = $request['current_level'] === $user['role'];

json_response(['data' => $request]);
