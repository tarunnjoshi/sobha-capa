<?php
// GET  /api/capa-requests.php?project=...&status=...   -> list (Inspection Requests / CAPA Workflow screens)
//      add &scope=mine for "my work" only
// POST /api/capa-requests.php                           -> raise a new request (supervisor only)

require __DIR__ . '/../helpers.php';

$user = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    listRequests($user);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    createRequest($user);
} else {
    json_response(['error' => 'Method not allowed'], 405);
}

function listRequests($user)
{
    // Which URL filters we accept, and which column each one filters.
    // Using a fixed list means users can't inject their own column names.
    $allowedFilters = [
        'project'      => 'p.name',
        'division'     => 's.division',
        'sub_division' => 's.sub_division',
        'activity'     => 's.activity',
        'sub_activity' => 's.name',
        'status'       => 'r.status',
        'created_date' => 'DATE(r.created_at)',
    ];

    $where = [];
    $params = [];
    foreach ($allowedFilters as $key => $column) {
        if (!empty($_GET[$key])) {
            $where[] = "$column = ?";
            $params[] = $_GET[$key];
        }
    }
    // ?search=leak -> match the text in any of these columns (top-right search box)
    $search = trim($_GET['search'] ?? '');
    if ($search !== '') {
        $searchColumns = ['p.name', 'r.tower', 'r.unit', 's.division', 's.activity', 's.name', 'r.defect_type', 'r.technician'];
        $where[] = '(' . implode(' OR ', array_map(fn($col) => "$col LIKE ?", $searchColumns)) . ')';
        foreach ($searchColumns as $col) {
            $params[] = "%$search%";
        }
    }

    // ?scope=mine -> only "my work" (CAPA Workflow menu). Without it -> all requests (Inspection Requests menu)
    //   supervisor: requests I raised
    //   approver:   requests that pass through my level
    //   admin:      everything (admin oversees all work)
    if (($_GET['scope'] ?? '') === 'mine') {
        if ($user['role'] === 'supervisor') {
            $where[] = 'r.created_by = ?';
            $params[] = $user['id'];
        } elseif (in_array($user['role'], ['engineer', 'qcs', 'qaqc'])) {
            $where[] = 'EXISTS (SELECT 1 FROM approvals x WHERE x.capa_request_id = r.id AND x.level = ?)';
            $params[] = $user['role'];
        }
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // GROUP_CONCAT joins the approval rows into one string per request,
    // e.g. levels = "engineer,qcs,qaqc" and step_statuses = "approved,approved,rejected"
    $sql = "SELECT r.id, p.name AS project, r.tower, s.division, s.activity, s.name AS sub_activity,
                   r.defect_type, r.defect_count, r.status, r.created_at,
                   GROUP_CONCAT(a.level  ORDER BY a.step_order) AS levels,
                   GROUP_CONCAT(a.status ORDER BY a.step_order) AS step_statuses
            FROM capa_requests r
            JOIN projects p ON p.id = r.project_id
            JOIN sub_activities s ON s.id = r.sub_activity_id
            LEFT JOIN approvals a ON a.capa_request_id = r.id
            $whereSql
            GROUP BY r.id
            ORDER BY r.id DESC";

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $levels = $row['levels'] ? explode(',', $row['levels']) : [];
        $statuses = $row['step_statuses'] ? explode(',', $row['step_statuses']) : [];

        // Turn the two strings back into a list of steps
        $steps = [];
        foreach ($levels as $i => $level) {
            $steps[] = ['level' => $level, 'status' => $statuses[$i]];
        }

        $row['steps'] = $steps;
        $row['current_level'] = current_level($row['status'], $steps);
        $row['my_turn'] = $row['current_level'] === $user['role'];
        unset($row['levels'], $row['step_statuses']);

        $result[] = $row;
    }

    // ?my_pending=1 -> only requests waiting for the logged-in user
    if (!empty($_GET['my_pending'])) {
        $result = array_values(array_filter($result, fn($r) => $r['my_turn']));
    }

    json_response(['data' => $result]);
}

function createRequest($user)
{
    require_role($user, ['supervisor']);

    $body = get_json_body();
    $required = ['project_id', 'tower', 'floor', 'unit', 'sub_activity_id', 'defect_type', 'defect_count', 'technician'];
    foreach ($required as $field) {
        if (empty($body[$field])) {
            json_response(['error' => "$field is required"], 422);
        }
    }

    // Read the Admin's rules for this project + sub-activity
    $stmt = db()->prepare('SELECT * FROM project_rules WHERE project_id = ? AND sub_activity_id = ?');
    $stmt->execute([$body['project_id'], $body['sub_activity_id']]);
    $rule = $stmt->fetch();
    if (!$rule) {
        json_response(['error' => 'No rules configured for this project and sub-activity'], 422);
    }

    // Build the approval steps from the ✅/❌ config
    $steps = [];
    if ($rule['engineer_required']) $steps[] = ['engineer', 1];
    if ($rule['qcs_required'])      $steps[] = ['qcs', 2];
    if ($rule['qaqc_required'])     $steps[] = ['qaqc', 3];
    if (!$steps) {
        json_response(['error' => 'No approval levels configured for this sub-activity in this project'], 422);
    }

    // A transaction makes the inserts "all or nothing":
    // we never end up with a request that has no approval steps.
    $pdo = db();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'INSERT INTO capa_requests (project_id, tower, floor, unit, sub_activity_id, defect_type, defect_count, technician, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $body['project_id'], $body['tower'], $body['floor'], $body['unit'], $body['sub_activity_id'],
        $body['defect_type'], (int) $body['defect_count'], $body['technician'], $user['id'],
    ]);
    $requestId = $pdo->lastInsertId();

    $stmt = $pdo->prepare('INSERT INTO approvals (capa_request_id, level, step_order) VALUES (?, ?, ?)');
    foreach ($steps as [$level, $order]) {
        $stmt->execute([$requestId, $level, $order]);
    }

    $pdo->commit();

    json_response(['message' => 'Request raised', 'id' => (int) $requestId], 201);
}
