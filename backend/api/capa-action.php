<?php
// POST /api/capa-action.php
// Body: {"request_id": 2, "action": "approve" | "reject", "comment": "..."}
// The logged-in approver approves or rejects their step.

require __DIR__ . '/../helpers.php';

$user = require_login();
require_role($user, ['engineer', 'qcs', 'qaqc']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Use POST'], 405);
}

$body = get_json_body();
$requestId = $body['request_id'] ?? null;
$action = $body['action'] ?? '';
$comment = trim($body['comment'] ?? '');

if (!$requestId || !in_array($action, ['approve', 'reject'])) {
    json_response(['error' => 'request_id and a valid action are required'], 422);
}
if ($action === 'reject' && $comment === '') {
    json_response(['error' => 'Please add a comment explaining the rejection'], 422);
}

$pdo = db();
$pdo->beginTransaction();

// 1. The request must exist and still be open
$stmt = $pdo->prepare('SELECT * FROM capa_requests WHERE id = ?');
$stmt->execute([$requestId]);
$request = $stmt->fetch();

if (!$request) {
    $pdo->rollBack();
    json_response(['error' => 'Request not found'], 404);
}
if ($request['status'] !== 'open') {
    $pdo->rollBack();
    json_response(['error' => 'This request is already ' . $request['status']], 422);
}

// 2. Find the current step (first pending one) and check it's this user's level
$stmt = $pdo->prepare(
    "SELECT * FROM approvals
     WHERE capa_request_id = ? AND status = 'pending'
     ORDER BY step_order LIMIT 1"
);
$stmt->execute([$requestId]);
$step = $stmt->fetch();

if (!$step || $step['level'] !== $user['role']) {
    $pdo->rollBack();
    json_response(['error' => 'It is not your turn to act on this request'], 403);
}

// 3. Save the decision on this step
$newStepStatus = $action === 'approve' ? 'approved' : 'rejected';
$stmt = $pdo->prepare(
    'UPDATE approvals SET status = ?, approver_id = ?, comment = ?, acted_at = NOW() WHERE id = ?'
);
$stmt->execute([$newStepStatus, $user['id'], $comment, $step['id']]);

// 4. Update the whole request's status
//    rejected at any level -> request rejected
//    approved and no pending steps left -> request closed
//    otherwise it stays open and moves to the next level
if ($action === 'reject') {
    $newRequestStatus = 'rejected';
} else {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM approvals WHERE capa_request_id = ? AND status = 'pending'");
    $stmt->execute([$requestId]);
    $pendingLeft = (int) $stmt->fetchColumn();
    $newRequestStatus = $pendingLeft === 0 ? 'closed' : 'open';
}

$stmt = $pdo->prepare('UPDATE capa_requests SET status = ? WHERE id = ?');
$stmt->execute([$newRequestStatus, $requestId]);

$pdo->commit();

json_response(['message' => 'Saved', 'request_status' => $newRequestStatus]);
