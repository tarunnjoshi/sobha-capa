<?php
// GET /api/sub-activities.php?division=...  -> list (Inspection Configuration screen,
//                                              also used for the "Raise Request" dropdown)
// PUT /api/sub-activities.php?id=3          -> update the rules (admin only)
//     Body: {"engineer_required": true, "qcs_required": true, "qaqc_required": false, "random_inspection_count": 20}

require __DIR__ . '/../helpers.php';

$user = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $allowedFilters = [
        'division'     => 'division',
        'sub_division' => 'sub_division',
        'activity'     => 'activity',
    ];

    $where = [];
    $params = [];
    foreach ($allowedFilters as $key => $column) {
        if (!empty($_GET[$key])) {
            $where[] = "$column = ?";
            $params[] = $_GET[$key];
        }
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = db()->prepare("SELECT * FROM sub_activities $whereSql ORDER BY id");
    $stmt->execute($params);

    json_response(['data' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    require_role($user, ['admin']);

    $id = $_GET['id'] ?? null;
    $body = get_json_body();

    $stmt = db()->prepare(
        'UPDATE sub_activities
         SET engineer_required = ?, qcs_required = ?, qaqc_required = ?, random_inspection_count = ?
         WHERE id = ?'
    );
    $stmt->execute([
        !empty($body['engineer_required']) ? 1 : 0,
        !empty($body['qcs_required']) ? 1 : 0,
        !empty($body['qaqc_required']) ? 1 : 0,
        $body['random_inspection_count'] ?: null, // empty -> NULL (shown as "-")
        $id,
    ]);

    json_response(['message' => 'Configuration updated']);
}

json_response(['error' => 'Method not allowed'], 405);
