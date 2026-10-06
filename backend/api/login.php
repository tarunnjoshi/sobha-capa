<?php
// POST /api/login.php
// Body: {"email": "...", "password": "..."}
// Returns: {"token": "...", "user": {...}}

require __DIR__ . '/../helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Use POST'], 405);
}

$body = get_json_body();
$email = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if ($email === '' || $password === '') {
    json_response(['error' => 'Email and password are required'], 422);
}

// 1. Find the user by email
$stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

// 2. Check the password against the stored hash
if (!$user || !password_verify($password, $user['password'])) {
    json_response(['error' => 'Wrong email or password'], 401);
}

// 3. Create a random token and save it
$token = bin2hex(random_bytes(32)); // 64 random characters
$stmt = db()->prepare('INSERT INTO user_tokens (user_id, token) VALUES (?, ?)');
$stmt->execute([$user['id'], $token]);

// 4. Send back the token and user info (never send the password hash)
json_response([
    'token' => $token,
    'user'  => [
        'id'    => $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ],
]);
