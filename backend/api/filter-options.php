<?php
// GET /api/filter-options.php
// Values for the filter dropdowns (Project, Division, ...).
// Taken from the data itself, so new values appear automatically.

require __DIR__ . '/../helpers.php';

require_login();

// Small helper: all unique values of one column, sorted
function distinct_values($table, $column)
{
    return db()->query("SELECT DISTINCT $column FROM $table ORDER BY $column")->fetchAll(PDO::FETCH_COLUMN);
}

json_response([
    'projects'       => distinct_values('capa_requests', 'project'),
    'divisions'      => distinct_values('sub_activities', 'division'),
    'sub_divisions'  => distinct_values('sub_activities', 'sub_division'),
    'activities'     => distinct_values('sub_activities', 'activity'),
    'sub_activities' => distinct_values('sub_activities', 'name'),
    'statuses'       => ['open', 'rejected', 'closed'],
]);
