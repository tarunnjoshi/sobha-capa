<?php
// GET /api/me.php
// Header: Authorization: Bearer <token>
// Returns the logged-in user. React calls this on page refresh
// to check if the saved token is still valid.

require __DIR__ . '/../helpers.php';

$user = require_login();

json_response(['user' => $user]);
