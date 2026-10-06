<?php
// POST /api/logout.php
// Header: Authorization: Bearer <token>
// Deletes the token so it can't be used again.

require __DIR__ . '/../helpers.php';

$user = require_login();

$token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
$stmt = db()->prepare('DELETE FROM user_tokens WHERE token = ?');
$stmt->execute([$token]);

json_response(['message' => 'Logged out']);
