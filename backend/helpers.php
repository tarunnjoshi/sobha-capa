<?php
// Small helper functions used by every API file.
// Each API file starts with: require __DIR__ . '/../helpers.php';

// ---------- CORS ----------
// React runs on localhost:5173 and PHP on localhost:8000.
// Browsers block calls between different ports unless the server allows it.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');

// Before a POST with JSON, the browser first sends an OPTIONS "may I?" request.
// We just say yes and stop.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- Database ----------
// Returns one shared PDO connection.
function db()
{
    static $pdo = null; // "static" keeps the value between calls, so we connect only once

    if ($pdo === null) {
        $config = require __DIR__ . '/config.php';
        $dsn = "mysql:host={$config['db_host']};port={$config['db_port']};dbname={$config['db_name']};charset=utf8mb4";

        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // throw errors instead of failing silently
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // rows come back as ['column' => value]
        ]);
    }

    return $pdo;
}

// ---------- Responses ----------
// Send data as JSON and stop the script.
function json_response($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Read the JSON body React sends (e.g. {"email": "...", "password": "..."}).
function get_json_body()
{
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// ---------- Auth ----------
// Finds the logged-in user from the "Authorization: Bearer <token>" header.
// If the token is missing or wrong, it stops with 401 (Unauthorized).
function require_login()
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = str_replace('Bearer ', '', $header);

    if ($token === '') {
        json_response(['error' => 'Please log in'], 401);
    }

    $stmt = db()->prepare(
        'SELECT users.id, users.name, users.email, users.role
         FROM user_tokens
         JOIN users ON users.id = user_tokens.user_id
         WHERE user_tokens.token = ?'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        json_response(['error' => 'Session expired, please log in again'], 401);
    }

    return $user;
}

// ---------- Workflow ----------
// Whose turn is it? The level of the first pending step, but only while the
// request is still open. Returns null if nobody needs to act.
function current_level($requestStatus, $steps)
{
    if ($requestStatus !== 'open') {
        return null;
    }
    foreach ($steps as $step) {
        if ($step['status'] === 'pending') {
            return $step['level'];
        }
    }
    return null;
}

// Stops with 403 (Forbidden) if the user's role is not in the allowed list.
// Example: require_role($user, ['admin']);
function require_role($user, $allowedRoles)
{
    if (!in_array($user['role'], $allowedRoles)) {
        json_response(['error' => 'You are not allowed to do this'], 403);
    }
}
