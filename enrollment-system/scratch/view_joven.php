<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=enrollment_system', 'root', '');
$stmt = $pdo->prepare("SELECT * FROM students WHERE id = 4");
$stmt->execute();
$s = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($s, JSON_PRETTY_PRINT);
