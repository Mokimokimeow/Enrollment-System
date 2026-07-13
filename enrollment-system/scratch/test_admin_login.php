<?php
// Simulate login post request
$_SERVER['REQUEST_METHOD'] = 'POST';
$_GET['action'] = 'login';

// Set up mock post body
$loginData = [
    'email' => 'admin@biringan.edu',
    'password' => 'admin123'
];

// Write this mock data to a temporary file, then read it via php://input override
// In PHP, we can't easily redefine php://input, but we can call the function directly or simulate it.
// Let's just include config and query database directly to see if the user exists and we can verify password.

$host = 'localhost';
$dbname = 'enrollment_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $stmt = $pdo->prepare("SELECT * FROM students WHERE email = ? AND status = 'approved'");
    $stmt->execute(['admin@biringan.edu']);
    $student = $stmt->fetch();
    
    if ($student) {
        echo "Found admin@biringan.edu in database.\n";
        echo "Name: " . $student['first_name'] . " " . $student['last_name'] . "\n";
        echo "Status: " . $student['status'] . "\n";
        echo "Password verification: " . (password_verify('admin123', $student['portal_password']) ? "SUCCESS" : "FAILED") . "\n";
    } else {
        echo "Error: admin@biringan.edu not found in database!\n";
    }
} catch (Exception $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?>
