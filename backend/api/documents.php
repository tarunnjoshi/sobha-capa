<?php
// POST /api/documents.php            -> upload files to a request (the supervisor who raised it)
//      multipart/form-data: request_id=5, files[]=<file>, files[]=<file>
// GET  /api/documents.php?id=3       -> download / view one document (any logged-in user)

require __DIR__ . '/../helpers.php';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB (same as PHP's default upload limit)
const MAX_FILES = 5;
// Allowed types, checked from the file CONTENT (not the name), mapped to the extension we save
const ALLOWED_TYPES = [
    'image/jpeg'      => 'jpg',
    'image/png'       => 'png',
    'application/pdf' => 'pdf',
];

$user = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = db()->prepare('SELECT * FROM documents WHERE id = ?');
    $stmt->execute([$_GET['id'] ?? 0]);
    $doc = $stmt->fetch();

    $path = $doc ? __DIR__ . '/../' . $doc['file_path'] : null;
    if (!$doc || !is_file($path)) {
        json_response(['error' => 'Document not found'], 404);
    }

    // Send the file itself instead of JSON. "inline" = open in the browser (image / PDF viewer)
    header('Content-Type: ' . $doc['mime_type']);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: inline; filename="' . basename($doc['original_name']) . '"');
    readfile($path);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

require_role($user, ['supervisor']);

// If the whole upload is bigger than PHP's post_max_size, PHP silently drops ALL of it
// ($_POST and $_FILES are empty). Catch that and give a clear message.
if (empty($_POST) && empty($_FILES) && ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    json_response(['error' => 'Upload is too large. Max 2 MB per file, 5 files at a time.'], 413);
}

// Only the supervisor who raised the request can attach files to it
$stmt = db()->prepare('SELECT created_by FROM capa_requests WHERE id = ?');
$stmt->execute([$_POST['request_id'] ?? 0]);
$request = $stmt->fetch();
if (!$request) {
    json_response(['error' => 'Request not found'], 404);
}
if ((int) $request['created_by'] !== (int) $user['id']) {
    json_response(['error' => 'You can only add documents to requests you raised'], 403);
}

// PHP gives multiple files as files[name][0], files[name][1]... -> turn into a simple list
$files = [];
foreach ($_FILES['files']['name'] ?? [] as $i => $name) {
    $files[] = [
        'name'     => $name,
        'tmp_name' => $_FILES['files']['tmp_name'][$i],
        'size'     => $_FILES['files']['size'][$i],
        'error'    => $_FILES['files']['error'][$i],
    ];
}

if (!$files) {
    json_response(['error' => 'Please choose at least one file'], 422);
}
if (count($files) > MAX_FILES) {
    json_response(['error' => 'You can upload up to ' . MAX_FILES . ' files at a time'], 422);
}

// 1. Check EVERY file first, so we never save half of a bad upload
$finfo = new finfo(FILEINFO_MIME_TYPE);
foreach ($files as $i => $file) {
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['size'] > MAX_FILE_SIZE) {
        json_response(['error' => "{$file['name']} is larger than 2 MB"], 422);
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        json_response(['error' => "{$file['name']} could not be uploaded"], 422);
    }
    $mime = $finfo->file($file['tmp_name']);
    if (!isset(ALLOWED_TYPES[$mime])) {
        json_response(['error' => "{$file['name']}: only JPG, PNG and PDF files are allowed"], 422);
    }
    $files[$i]['mime'] = $mime;
}

// 2. Save each file with a random name (never trust the user's file name on disk)
$stmt = db()->prepare(
    'INSERT INTO documents (capa_request_id, original_name, file_path, mime_type, size_bytes, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)'
);
foreach ($files as $file) {
    $relativePath = 'uploads/' . bin2hex(random_bytes(16)) . '.' . ALLOWED_TYPES[$file['mime']];
    move_uploaded_file($file['tmp_name'], __DIR__ . '/../' . $relativePath);

    $stmt->execute([
        $_POST['request_id'], $file['name'], $relativePath, $file['mime'], $file['size'], $user['id'],
    ]);
}

json_response(['message' => count($files) . ' document(s) uploaded'], 201);
