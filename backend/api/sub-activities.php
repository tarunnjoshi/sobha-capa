<?php
// GET /api/sub-activities.php?project_id=1&division=...
//     -> every sub-activity with THIS project's rules
//        (Inspection Configuration screen, and the "Raise Request" dropdown)
// PUT /api/sub-activities.php?project_id=1&id=3  -> update this project's rule (admin only)
//     Body: {"engineer_required": true, "qcs_required": true, "qaqc_required": false, "random_inspection_count": 20}

require __DIR__ . '/../helpers.php';

$user = require_login();

$projectId = $_GET['project_id'] ?? null;
if (!$projectId) {
    json_response(['error' => 'project_id is required'], 422);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $allowedFilters = [
        'division'     => 's.division',
        'sub_division' => 's.sub_division',
        'activity'     => 's.activity',
    ];

    $where = [];
    $params = [$projectId]; // first ? is the project in the JOIN
    foreach ($allowedFilters as $key => $column) {
        if (!empty($_GET[$key])) {
            $where[] = "$column = ?";
            $params[] = $_GET[$key];
        }
    }
    // ?search=tile -> match the sub-activity or activity name
    $search = trim($_GET['search'] ?? '');
    if ($search !== '') {
        $where[] = '(s.name LIKE ? OR s.activity LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // LEFT JOIN: a sub-activity with no rule yet still shows (with everything ❌)
    $stmt = db()->prepare(
        "SELECT s.*,
                COALESCE(r.engineer_required, 0) AS engineer_required,
                COALESCE(r.qcs_required, 0)      AS qcs_required,
                COALESCE(r.qaqc_required, 0)     AS qaqc_required,
                r.random_inspection_count
         FROM sub_activities s
         LEFT JOIN project_rules r ON r.sub_activity_id = s.id AND r.project_id = ?
         $whereSql
         ORDER BY s.id"
    );
    $stmt->execute($params);

    json_response(['data' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    require_role($user, ['admin']);

    $subActivityId = $_GET['id'] ?? null;
    $body = get_json_body();

    // "Upsert": insert the rule, or update it if this project + sub-activity already has one
    // (works because of the UNIQUE (project_id, sub_activity_id) key)
    $stmt = db()->prepare(
        'INSERT INTO project_rules
            (project_id, sub_activity_id, engineer_required, qcs_required, qaqc_required, random_inspection_count)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            engineer_required       = VALUES(engineer_required),
            qcs_required            = VALUES(qcs_required),
            qaqc_required           = VALUES(qaqc_required),
            random_inspection_count = VALUES(random_inspection_count)'
    );
    $stmt->execute([
        $projectId,
        $subActivityId,
        !empty($body['engineer_required']) ? 1 : 0,
        !empty($body['qcs_required']) ? 1 : 0,
        !empty($body['qaqc_required']) ? 1 : 0,
        ($body['random_inspection_count'] ?? '') === '' ? null : (int) $body['random_inspection_count'],
    ]);

    json_response(['message' => 'Configuration updated']);
}

json_response(['error' => 'Method not allowed'], 405);
