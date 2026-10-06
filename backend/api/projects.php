<?php
// GET  /api/projects.php  -> all projects with how many requests each has
// POST /api/projects.php  -> add a project (admin only)
//      Body: {"name": "Sobha One", "copy_from_project_id": 1}   (copy_from is optional)

require __DIR__ . '/../helpers.php';

$user = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = db()->query(
        'SELECT p.id, p.name, p.created_at, COUNT(r.id) AS request_count
         FROM projects p
         LEFT JOIN capa_requests r ON r.project_id = p.id
         GROUP BY p.id
         ORDER BY p.name'
    )->fetchAll();

    json_response(['data' => $rows]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_role($user, ['admin']);

    $body = get_json_body();
    $name = trim($body['name'] ?? '');
    $copyFrom = $body['copy_from_project_id'] ?? null;

    if ($name === '') {
        json_response(['error' => 'Project name is required'], 422);
    }

    // Names must be unique (the table also has a UNIQUE key as a safety net)
    $stmt = db()->prepare('SELECT id FROM projects WHERE name = ?');
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        json_response(['error' => 'A project with this name already exists'], 422);
    }

    // Transaction: the project and its copied rules are saved together, or not at all
    $pdo = db();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('INSERT INTO projects (name) VALUES (?)');
    $stmt->execute([$name]);
    $projectId = $pdo->lastInsertId();

    // Optional: start with the same rules as an existing project
    if ($copyFrom) {
        $stmt = $pdo->prepare(
            'INSERT INTO project_rules
                (project_id, sub_activity_id, engineer_required, qcs_required, qaqc_required, random_inspection_count)
             SELECT ?, sub_activity_id, engineer_required, qcs_required, qaqc_required, random_inspection_count
             FROM project_rules
             WHERE project_id = ?'
        );
        $stmt->execute([$projectId, $copyFrom]);
    }

    $pdo->commit();

    json_response(['message' => 'Project added', 'id' => (int) $projectId], 201);
}

json_response(['error' => 'Method not allowed'], 405);
