<?php
$content = file_get_contents('javascript/app.js');
$count = substr_count($content, 'Swal');
echo "Number of Swal occurrences in app.js: $count\n";

// Find lines containing Swal
$lines = explode("\n", $content);
foreach ($lines as $i => $line) {
    if (strpos($line, 'Swal') !== false) {
        echo "Line " . ($i + 1) . ": " . trim($line) . "\n";
    }
}
?>
