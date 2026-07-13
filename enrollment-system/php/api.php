<?php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Enable output buffering
ob_start();

// Debug logging
error_log('API called. Method: ' . $_SERVER['REQUEST_METHOD']);
error_log('GET params: ' . json_encode($_GET));

// Get action from GET or POST body
$action = $_GET['action'] ?? null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['action'])) {
        $action = $input['action'];
    }
}

error_log('Action: ' . $action);
error_log('Request method: ' . $_SERVER['REQUEST_METHOD']);
error_log('GET params: ' . json_encode($_GET));
error_log('POST body: ' . file_get_contents('php://input'));

// Test response to ensure script is running
if ($action === 'test') {
    echo json_encode(['success' => true, 'message' => 'API is working']);
    exit();
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = '127.0.0.1';
$dbname = 'enrollment_system';
$username = 'root';
$password = '';

try {
    // First connect without database to create it if needed
    $pdo = new PDO("mysql:host=$host;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname`");
    
    // Create students table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `students` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `last_name` VARCHAR(100) NOT NULL,
          `first_name` VARCHAR(100) NOT NULL,
          `middle_name` VARCHAR(100) DEFAULT NULL,
          `suffix` VARCHAR(20) DEFAULT NULL,
          `dob` DATE NOT NULL,
          `gender` VARCHAR(20) NOT NULL,
          `civil_status` VARCHAR(20) NOT NULL,
          `nationality` VARCHAR(50) NOT NULL,
          `religion` VARCHAR(50) NOT NULL,
          `dialect` VARCHAR(50) NOT NULL,
          `place_of_birth` VARCHAR(200) NOT NULL,
          `address` TEXT NOT NULL,
          `region` VARCHAR(100) DEFAULT NULL,
          `province` VARCHAR(100) DEFAULT NULL,
          `city` VARCHAR(100) DEFAULT NULL,
          `barangay` VARCHAR(100) DEFAULT NULL,
          `email` VARCHAR(180) NOT NULL,
          `phone` VARCHAR(20) NOT NULL,
          `mother_last_name` VARCHAR(100) NOT NULL,
          `mother_first_name` VARCHAR(100) NOT NULL,
          `mother_middle_name` VARCHAR(100) DEFAULT NULL,
          `mother_phone` VARCHAR(20) NOT NULL,
          `mother_landline` VARCHAR(20) DEFAULT NULL,
          `mother_occupation` VARCHAR(100) NOT NULL,
          `mother_address` TEXT NOT NULL,
          `mother_deceased` TINYINT(1) DEFAULT 0,
          `guardian_last_name` VARCHAR(100) NOT NULL,
          `guardian_first_name` VARCHAR(100) NOT NULL,
          `guardian_middle_name` VARCHAR(100) DEFAULT NULL,
          `guardian_phone` VARCHAR(20) NOT NULL,
          `guardian_landline` VARCHAR(20) DEFAULT NULL,
          `guardian_occupation` VARCHAR(100) NOT NULL,
          `guardian_address` TEXT NOT NULL,
          `level` VARCHAR(50) NOT NULL,
          `strand` VARCHAR(50) NOT NULL,
          `voucher_eligible` VARCHAR(20) NOT NULL,
          `data_privacy_agreed` TINYINT(1) DEFAULT 0,
          `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
          `password_hash` VARCHAR(255) DEFAULT NULL,
          `approved_at` DATETIME DEFAULT NULL,
          `created_at` DATETIME NOT NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uniq_students_email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Create grades table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `grades` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `student_id` INT UNSIGNED NOT NULL,
          `subject` VARCHAR(100) NOT NULL,
          `q1` INT DEFAULT 0,
          `q2` INT DEFAULT 0,
          `q3` INT DEFAULT 0,
          `q4` INT DEFAULT 0,
          `final` DECIMAL(5,2) DEFAULT 0.00,
          `remarks` VARCHAR(50) DEFAULT 'Passed',
          PRIMARY KEY (`id`),
          KEY `idx_grades_student` (`student_id`),
          CONSTRAINT `fk_grades_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // Create schedules table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `schedules` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `student_id` INT UNSIGNED NOT NULL,
          `day` VARCHAR(20) NOT NULL,
          `subject` VARCHAR(100) NOT NULL,
          `time` VARCHAR(100) NOT NULL,
          `room` VARCHAR(50) NOT NULL,
          PRIMARY KEY (`id`),
          KEY `idx_schedules_student` (`student_id`),
          CONSTRAINT `fk_schedules_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    // Create subjects table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `subjects` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `level_strand` VARCHAR(50) NOT NULL,
          `code` VARCHAR(20) NOT NULL,
          `name` VARCHAR(150) NOT NULL,
          `description` TEXT,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          KEY `idx_subjects_strand` (`level_strand`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // Seed subjects if table is completely empty
    $subjectCount = $pdo->query("SELECT COUNT(*) FROM `subjects`")->fetchColumn();
    if ($subjectCount == 0) {
        $defaultSubjects = [
            ['jhs', 'ENG-JHS', 'English', 'Language arts, grammar, reading comprehension, and world literature.'],
            ['jhs', 'FIL-JHS', 'Filipino', 'Wika at Panitikan — Ibong Adarna, Florante at Laura, Noli Me Tangere, El Filibusterismo.'],
            ['jhs', 'MATH-JHS', 'Mathematics', 'Algebra, Geometry, Trigonometry, Statistics, and Probability.'],
            ['jhs', 'SCI-JHS', 'Science', 'Integrated Earth Science, Biology, Chemistry, and Physics.'],
            ['jhs', 'AP-JHS', 'Araling Panlipunan', 'Philippine History, Asian Studies, World History, and Contemporary Issues.'],
            ['jhs', 'MAPEH-JHS', 'MAPEH', 'Music, Arts, Physical Education, and Health.'],
            ['jhs', 'ESP-JHS', 'Edukasyon sa Pagpapakatao (EsP)', 'Values Education, GMRC, ethics, and character building.'],
            ['jhs', 'TLE-JHS', 'Technology & Livelihood Education', 'Agri-Fishery Arts, Home Economics, Industrial Arts, and ICT.'],
            ['stem', 'STEM-PC', 'Pre-Calculus', 'Analytic geometry, series, mathematical induction, and trigonometry.'],
            ['stem', 'STEM-BC', 'Basic Calculus', 'Limits, continuity, derivatives, and integration.'],
            ['stem', 'STEM-BIO', 'General Biology 1 & 2', 'Cell biology, genetics, anatomy, and physiology.'],
            ['stem', 'STEM-CHEM', 'General Chemistry 1 & 2', 'Atomic structure, stoichiometry, gas laws, and thermodynamics.'],
            ['stem', 'STEM-PHYS', 'General Physics 1 & 2', 'Mechanics, waves, electricity, and magnetism.'],
            ['stem', 'SHS-CORE', 'SHS Core Subjects', 'General Mathematics, Oral Communication, Statistics, Philosophy, E-Tech, and PE.'],
            ['abm', 'ABM-ECON', 'Applied Economics', 'Basic economic principles and contemporary issues in the Philippines.'],
            ['abm', 'ABM-MATH', 'Business Math', 'Interest rates, salaries, mark-ups, and commercial calculations.'],
            ['abm', 'ABM-MGMT', 'Organization & Management', 'Business planning, organizing, leading, and controlling.'],
            ['abm', 'ABM-FABM1', 'FABM 1', 'Double-entry bookkeeping, ledger accounts, and the accounting cycle.'],
            ['abm', 'ABM-FABM2', 'FABM 2', 'Financial statements, cash flow, bank reconciliation, and business taxes.'],
            ['abm', 'ABM-FIN', 'Business Finance', 'Financial planning, investments, working capital, and budgets.'],
            ['humss', 'HUMSS-CW', 'Creative Writing', 'Fiction, poetry, and drama writing techniques.'],
            ['humss', 'HUMSS-CNF', 'Creative Nonfiction', 'Essays, memoirs, autobiographies, and literary journalism.'],
            ['humss', 'HUMSS-WR', 'World Religions & Beliefs', 'Origins, history, and doctrines of major world religions.'],
            ['humss', 'HUMSS-TN', 'Trends & Critical Thinking', 'Developing critical thinking and analyzing global trends.'],
            ['humss', 'HUMSS-PPG', 'Philippine Politics & Gov.', 'Constitution, branches of government, and local politics.'],
            ['humss', 'HUMSS-DISS', 'Disciplines in Social Sciences', 'Anthropology, sociology, economics, history, and social theories.'],
            ['tvl-he', 'HE-COOK', 'Cookery & Culinary Arts', 'Food safety, knife skills, food prep, and kitchen operations.'],
            ['tvl-he', 'HE-BPP', 'Bread & Pastry Production', 'Breads, cakes, pastries, pies, and desserts.'],
            ['tvl-he', 'HE-FBS', 'Food & Beverage Services', 'Dining set-up, table service, and order taking.'],
            ['tvl-he', 'HE-HK', 'Housekeeping Services', 'Hotel cleaning operations, guest relations, and laundry.'],
            ['tvl-he', 'HE-TOUR', 'Tourism Promotion Services', 'Destination marketing, tour guiding, and itinerary planning.'],
            ['tvl-he', 'SHS-CORE', 'SHS Core Subjects', 'General Mathematics, Oral Communication, Statistics, Philosophy, E-Tech, and PE.'],
            ['tvl-ict', 'ICT-CSS', 'Computer Systems Servicing', 'Hardware assembly, OS installation, and networking.'],
            ['tvl-ict', 'ICT-PROG', 'Computer Programming', 'Programming concepts, logic, data structures, and algorithms.'],
            ['tvl-ict', 'ICT-WEB', 'Web Design & Development', 'HTML, CSS, JavaScript, responsive design, and hosting.'],
            ['tvl-ict', 'ICT-ANIM', 'Animation & Illustration', 'Drawing, storyboarding, digital illustration, and keyframe animation.'],
            ['tvl-ict', 'SHS-CORE', 'SHS Core Subjects', 'General Mathematics, Oral Communication, Statistics, Philosophy, E-Tech, and PE.'],
            ['tvl-ia', 'IA-SMAW', 'Shielded Metal Arc Welding', 'Welding safety, metal preparation, and industrial arc welding.'],
            ['tvl-ia', 'IA-EIM', 'Electrical Installation', 'Building wiring, safety standards, and electrical maintenance.'],
            ['tvl-ia', 'IA-AUTO', 'Automotive Servicing', 'Engine tuning, brake systems, and chassis maintenance.'],
            ['tvl-ia', 'IA-DRAFT', 'Technical Drafting / CAD', 'Blueprints, orthographic views, and computer-aided design.'],
            ['tvl-ia', 'SHS-CORE', 'SHS Core Subjects', 'General Mathematics, Oral Communication, Statistics, Philosophy, E-Tech, and PE.']
        ];
        $stmt = $pdo->prepare("INSERT INTO subjects (level_strand, code, name, description) VALUES (?, ?, ?, ?)");
        foreach ($defaultSubjects as $sub) {
            $stmt->execute($sub);
        }
    }

    // Add missing columns if table exists but is missing columns
    $columnsToAdd = [
        'suffix' => 'ALTER TABLE students ADD COLUMN suffix VARCHAR(20) DEFAULT NULL AFTER middle_name',
        'gender' => 'ALTER TABLE students ADD COLUMN gender VARCHAR(20) NOT NULL AFTER suffix',
        'civil_status' => 'ALTER TABLE students ADD COLUMN civil_status VARCHAR(20) NOT NULL AFTER gender',
        'nationality' => 'ALTER TABLE students ADD COLUMN nationality VARCHAR(50) NOT NULL AFTER civil_status',
        'religion' => 'ALTER TABLE students ADD COLUMN religion VARCHAR(50) NOT NULL AFTER nationality',
        'dialect' => 'ALTER TABLE students ADD COLUMN dialect VARCHAR(50) NOT NULL AFTER religion',
        'place_of_birth' => 'ALTER TABLE students ADD COLUMN place_of_birth VARCHAR(200) NOT NULL AFTER dialect',
        'region' => 'ALTER TABLE students ADD COLUMN region VARCHAR(100) DEFAULT NULL AFTER address',
        'province' => 'ALTER TABLE students ADD COLUMN province VARCHAR(100) DEFAULT NULL AFTER region',
        'city' => 'ALTER TABLE students ADD COLUMN city VARCHAR(100) DEFAULT NULL AFTER province',
        'barangay' => 'ALTER TABLE students ADD COLUMN barangay VARCHAR(100) DEFAULT NULL AFTER city',
        'zip_code' => 'ALTER TABLE students ADD COLUMN zip_code VARCHAR(20) DEFAULT NULL AFTER barangay',
        'landline' => 'ALTER TABLE students ADD COLUMN landline VARCHAR(20) DEFAULT NULL AFTER phone',
        'elementary_school' => 'ALTER TABLE students ADD COLUMN elementary_school VARCHAR(200) NOT NULL AFTER email',
        'elementary_year_graduated' => 'ALTER TABLE students ADD COLUMN elementary_year_graduated YEAR NOT NULL AFTER elementary_school',
        'lrn' => 'ALTER TABLE students ADD COLUMN lrn VARCHAR(20) NOT NULL AFTER elementary_year_graduated',
        'high_school' => 'ALTER TABLE students ADD COLUMN high_school VARCHAR(200) NOT NULL AFTER lrn',
        'high_school_year_graduated' => 'ALTER TABLE students ADD COLUMN high_school_year_graduated YEAR NOT NULL AFTER high_school',
        'grade10_section' => 'ALTER TABLE students ADD COLUMN grade10_section VARCHAR(50) NOT NULL AFTER high_school_year_graduated',
        'senior_high_school' => 'ALTER TABLE students ADD COLUMN senior_high_school VARCHAR(200) NOT NULL AFTER grade10_section',
        'public_school_graduate' => 'ALTER TABLE students ADD COLUMN public_school_graduate VARCHAR(20) NOT NULL AFTER senior_high_school',
        'level' => 'ALTER TABLE students ADD COLUMN level VARCHAR(50) DEFAULT NULL AFTER public_school_graduate',
        'strand' => 'ALTER TABLE students ADD COLUMN strand VARCHAR(50) DEFAULT NULL AFTER level',
        'grade_level' => 'ALTER TABLE students ADD COLUMN grade_level VARCHAR(20) DEFAULT NULL AFTER level',
        'voucher_eligibility' => 'ALTER TABLE students ADD COLUMN voucher_eligibility VARCHAR(50) DEFAULT NULL AFTER strand',
        'father_last_name' => 'ALTER TABLE students ADD COLUMN father_last_name VARCHAR(100) NOT NULL AFTER voucher_eligibility',
        'father_first_name' => 'ALTER TABLE students ADD COLUMN father_first_name VARCHAR(100) NOT NULL AFTER father_last_name',
        'father_middle_name' => 'ALTER TABLE students ADD COLUMN father_middle_name VARCHAR(100) DEFAULT NULL AFTER father_first_name',
        'father_phone' => 'ALTER TABLE students ADD COLUMN father_phone VARCHAR(20) NOT NULL AFTER father_middle_name',
        'father_landline' => 'ALTER TABLE students ADD COLUMN father_landline VARCHAR(20) DEFAULT NULL AFTER father_phone',
        'father_occupation' => 'ALTER TABLE students ADD COLUMN father_occupation VARCHAR(100) NOT NULL AFTER father_landline',
        'father_address' => 'ALTER TABLE students ADD COLUMN father_address TEXT NOT NULL AFTER father_occupation',
        'father_deceased' => 'ALTER TABLE students ADD COLUMN father_deceased TINYINT(1) DEFAULT 0 AFTER father_address',
        'mother_last_name' => 'ALTER TABLE students ADD COLUMN mother_last_name VARCHAR(100) NOT NULL AFTER father_deceased',
        'mother_first_name' => 'ALTER TABLE students ADD COLUMN mother_first_name VARCHAR(100) NOT NULL AFTER mother_last_name',
        'mother_middle_name' => 'ALTER TABLE students ADD COLUMN mother_middle_name VARCHAR(100) DEFAULT NULL AFTER mother_first_name',
        'mother_phone' => 'ALTER TABLE students ADD COLUMN mother_phone VARCHAR(20) NOT NULL AFTER mother_middle_name',
        'mother_landline' => 'ALTER TABLE students ADD COLUMN mother_landline VARCHAR(20) DEFAULT NULL AFTER mother_phone',
        'mother_occupation' => 'ALTER TABLE students ADD COLUMN mother_occupation VARCHAR(100) NOT NULL AFTER mother_landline',
        'mother_address' => 'ALTER TABLE students ADD COLUMN mother_address TEXT NOT NULL AFTER mother_occupation',
        'mother_deceased' => 'ALTER TABLE students ADD COLUMN mother_deceased TINYINT(1) DEFAULT 0 AFTER mother_address',
        'guardian_last_name' => 'ALTER TABLE students ADD COLUMN guardian_last_name VARCHAR(100) NOT NULL AFTER mother_deceased',
        'guardian_first_name' => 'ALTER TABLE students ADD COLUMN guardian_first_name VARCHAR(100) NOT NULL AFTER guardian_last_name',
        'guardian_middle_name' => 'ALTER TABLE students ADD COLUMN guardian_middle_name VARCHAR(100) DEFAULT NULL AFTER guardian_first_name',
        'guardian_phone' => 'ALTER TABLE students ADD COLUMN guardian_phone VARCHAR(20) NOT NULL AFTER guardian_middle_name',
        'guardian_landline' => 'ALTER TABLE students ADD COLUMN guardian_landline VARCHAR(20) DEFAULT NULL AFTER guardian_phone',
        'guardian_occupation' => 'ALTER TABLE students ADD COLUMN guardian_occupation VARCHAR(100) NOT NULL AFTER guardian_landline',
        'guardian_address' => 'ALTER TABLE students ADD COLUMN guardian_address TEXT NOT NULL AFTER guardian_occupation',
        'data_privacy_agreed' => 'ALTER TABLE students ADD COLUMN data_privacy_agreed TINYINT(1) DEFAULT 0 AFTER guardian_address',
        'student_id' => 'ALTER TABLE students ADD COLUMN student_id VARCHAR(20) DEFAULT NULL AFTER data_privacy_agreed',
        'portal_access' => 'ALTER TABLE students ADD COLUMN portal_access TINYINT(1) DEFAULT 0 AFTER student_id',
        'portal_password' => 'ALTER TABLE students ADD COLUMN portal_password VARCHAR(255) DEFAULT NULL AFTER portal_access',
        'class_section' => 'ALTER TABLE students ADD COLUMN class_section VARCHAR(50) DEFAULT NULL AFTER portal_password'
    ];
    
    foreach ($columnsToAdd as $column => $sql) {
        try {
            $pdo->exec($sql);
        } catch (PDOException $e) {
            // Column already exists, ignore error
            if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                error_log("Error adding column $column: " . $e->getMessage());
            }
        }
    }
    
    // Update all existing approved students to use default password 'password123'
    try {
        $defaultPassword = password_hash('password123', PASSWORD_DEFAULT);
        // Also update approved students with NULL password, student ID, and section
        $updateStmt2 = $pdo->prepare("UPDATE students SET portal_password = ? WHERE status = 'approved' AND portal_password IS NULL");
        $updateStmt2->execute([$defaultPassword]);
        $pdo->prepare("UPDATE students SET student_id = '2026-TMP-0001' WHERE status = 'approved' AND (student_id IS NULL OR student_id = '')")->execute();
        $pdo->prepare("UPDATE students SET class_section = 'TMP-A' WHERE status = 'approved' AND (class_section IS NULL OR class_section = '')")->execute();
        $pdo->prepare("UPDATE students SET portal_access = 1 WHERE status = 'approved' AND (portal_access = 0 OR portal_access IS NULL)")->execute();
        error_log('Updated all approved students with default password and section details');
    } catch (Exception $e) {
        error_log('Note: Could not update existing passwords: ' . $e->getMessage());
    }
    
    // Create temporary test student account if it doesn't exist
    try {
        $stmt = $pdo->prepare("SELECT id FROM students WHERE email = ?");
        $stmt->execute(['temp@academy.local']);
        $tempStudent = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tempStudent) {
            $tempPassword = password_hash('password123', PASSWORD_DEFAULT);
            $insertStmt = $pdo->prepare("
                INSERT INTO students 
                (last_name, first_name, middle_name, email, phone, dob, address, 
                 guardian_last_name, guardian_first_name, guardian_phone, guardian_occupation, guardian_address,
                 level, strand, status, portal_password, portal_access, student_id, class_section, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $insertStmt->execute([
                'Test',
                'Student',
                'Temporary',
                'temp@academy.local',
                '09123456789',
                '2006-05-15',
                '123 Test Street',
                'Parent',
                'Guardian',
                '09123456789',
                'Parent',
                '123 Test Street',
                'Senior High School',
                'SHS-01',
                'approved',
                $tempPassword,
                1,
                '2026-TMP-0001',
                'TMP-A'
            ]);
            error_log('Created temporary test student account: temp@academy.local');
        } else {
            error_log('Temporary test student account already exists');
        }
    } catch (Exception $e) {
        error_log('Note: Could not create/check temporary student: ' . $e->getMessage());
    }
    
    // Create admin account if it doesn't exist
    try {
        $stmt = $pdo->prepare("SELECT id FROM students WHERE email = ?");
        $stmt->execute(['admin@university.local']);
        $adminUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$adminUser) {
            $adminPassword = password_hash('password123', PASSWORD_DEFAULT);
            $insertStmt = $pdo->prepare("
                INSERT INTO students 
                (last_name, first_name, middle_name, email, phone, dob, address, 
                 guardian_last_name, guardian_first_name, guardian_phone, guardian_occupation, guardian_address,
                 level, strand, status, portal_password, portal_access, student_id, class_section, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $insertStmt->execute([
                'Admin',
                'System',
                'Office',
                'admin@university.local',
                '09000000000',
                '1990-01-01',
                'Admin Office',
                'Admin',
                'Parent',
                '09000000000',
                'Administrator',
                'Admin Office',
                'Administration',
                'N/A',
                'approved',
                $adminPassword,
                1,
                'ADMIN-01',
                'ADMIN'
            ]);
            error_log('Created admin account: admin@university.local');
        }
    } catch (Exception $e) {
        error_log('Note: Could not create admin user: ' . $e->getMessage());
    }
    
    // Create admin account admin@biringan.edu if it doesn't exist
    try {
        $stmt = $pdo->prepare("SELECT id, portal_password FROM students WHERE email = ?");
        $stmt->execute(['admin@biringan.edu']);
        $adminUser2 = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$adminUser2) {
            $adminPassword2 = password_hash('admin123', PASSWORD_DEFAULT);
            $insertStmt = $pdo->prepare("
                INSERT INTO students 
                (last_name, first_name, middle_name, email, phone, dob, address, 
                 guardian_last_name, guardian_first_name, guardian_phone, guardian_occupation, guardian_address,
                 level, strand, status, portal_password, portal_access, student_id, class_section, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $insertStmt->execute([
                'Admin',
                'System',
                'Office',
                'admin@biringan.edu',
                '09000000000',
                '1990-01-01',
                'Admin Office',
                'Admin',
                'Parent',
                '09000000000',
                'Administrator',
                'Admin Office',
                'Administration',
                'N/A',
                'approved',
                $adminPassword2,
                1,
                'ADMIN-02',
                'ADMIN'
            ]);
            error_log('Created admin account: admin@biringan.edu');
        } else {
            // Force password to match 'admin123' if it doesn't match
            if (!password_verify('admin123', $adminUser2['portal_password'])) {
                $adminPassword2 = password_hash('admin123', PASSWORD_DEFAULT);
                $updateStmt = $pdo->prepare("UPDATE students SET portal_password = ? WHERE id = ?");
                $updateStmt->execute([$adminPassword2, $adminUser2['id']]);
            }
        }
    } catch (Exception $e) {
        error_log('Note: Could not create second admin user: ' . $e->getMessage());
    }
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'register') {
        // Handle student registration
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            // Log received data for debugging
            error_log('Registration data received: ' . json_encode($data));
            
            // Check for required fields
            $requiredFields = ['lastName', 'firstName', 'dob', 'gender', 'civilStatus', 'nationality', 'religion', 'dialect', 'placeOfBirth', 'address', 'phone', 'email', 'elementarySchool', 'elementaryYearGraduated', 'lrn', 'level', 'fatherLastName', 'fatherFirstName', 'fatherPhone', 'fatherOccupation', 'fatherAddress', 'motherLastName', 'motherFirstName', 'motherPhone', 'motherOccupation', 'motherAddress', 'guardianLastName', 'guardianFirstName', 'guardianPhone', 'guardianOccupation', 'guardianAddress'];
            
            $level = $data['level'] ?? '';
            if (stripos($level, 'senior') !== false) {
                $requiredFields[] = 'highSchool';
                $requiredFields[] = 'highSchoolYearGraduated';
                $requiredFields[] = 'grade10Section';
                $requiredFields[] = 'seniorHighSchool';
                $requiredFields[] = 'publicSchoolGraduate';
            }
            
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
                    exit();
                }
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO students 
                (last_name, first_name, middle_name, suffix, dob, gender, civil_status, nationality, religion, dialect, place_of_birth,
                 address, region, province, city, barangay, zip_code, phone, landline, email,
                 elementary_school, elementary_year_graduated, lrn, high_school, high_school_year_graduated, grade10_section, senior_high_school, public_school_graduate,
                 level, grade_level, strand, voucher_eligibility,
                 father_last_name, father_first_name, father_middle_name, father_phone, father_landline, father_occupation, father_address, father_deceased,
                 mother_last_name, mother_first_name, mother_middle_name, mother_phone, mother_landline, mother_occupation, mother_address, mother_deceased,
                 guardian_last_name, guardian_first_name, guardian_middle_name, guardian_phone, guardian_landline, guardian_occupation, guardian_address,
                 data_privacy_agreed, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $data['lastName'] ?? '',
                $data['firstName'] ?? '',
                $data['middleName'] ?? null,
                $data['suffix'] ?? null,
                $data['dob'] ?? '',
                $data['gender'] ?? '',
                $data['civilStatus'] ?? '',
                $data['nationality'] ?? '',
                $data['religion'] ?? '',
                $data['dialect'] ?? '',
                $data['placeOfBirth'] ?? '',
                $data['address'] ?? '',
                $data['region'] ?? null,
                $data['province'] ?? null,
                $data['city'] ?? null,
                $data['barangay'] ?? null,
                $data['zipCode'] ?? null,
                $data['phone'] ?? '',
                $data['landline'] ?? null,
                $data['email'] ?? '',
                $data['elementarySchool'] ?? '',
                $data['elementaryYearGraduated'] ?? '',
                $data['lrn'] ?? '',
                $data['highSchool'] ?? '',
                $data['highSchoolYearGraduated'] ?? '',
                $data['grade10Section'] ?? '',
                $data['seniorHighSchool'] ?? '',
                $data['publicSchoolGraduate'] ?? '',
                $data['level'] ?? '',
                $data['gradeLevel'] ?? null,
                $data['strand'] ?? null,
                $data['voucherEligibility'] ?? null,
                $data['fatherLastName'] ?? '',
                $data['fatherFirstName'] ?? '',
                $data['fatherMiddleName'] ?? null,
                $data['fatherPhone'] ?? '',
                $data['fatherLandline'] ?? null,
                $data['fatherOccupation'] ?? '',
                $data['fatherAddress'] ?? '',
                $data['fatherDeceased'] ?? 0,
                $data['motherLastName'] ?? '',
                $data['motherFirstName'] ?? '',
                $data['motherMiddleName'] ?? null,
                $data['motherPhone'] ?? '',
                $data['motherLandline'] ?? null,
                $data['motherOccupation'] ?? '',
                $data['motherAddress'] ?? '',
                $data['motherDeceased'] ?? 0,
                $data['guardianLastName'] ?? '',
                $data['guardianFirstName'] ?? '',
                $data['guardianMiddleName'] ?? null,
                $data['guardianPhone'] ?? '',
                $data['guardianLandline'] ?? null,
                $data['guardianOccupation'] ?? '',
                $data['guardianAddress'] ?? '',
                $data['dataPrivacyAgreed'] ?? 0,
                'pending'
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Registration submitted successfully. Your application is now pending admin review.',
                'student_id' => $pdo->lastInsertId()
            ]);
        } catch (PDOException $e) {
            error_log('Registration PDO Error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
        } catch (Exception $e) {
            error_log('Registration General Error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
        }
    } elseif ($action === 'login') {
        // Handle student login
        $data = json_decode(file_get_contents('php://input'), true);
        error_log('Login endpoint reached');
        try {
            if (!isset($data['email']) || !isset($data['password'])) {
                error_log('Missing email or password');
                echo json_encode(['success' => false, 'message' => 'Email and password are required']);
                ob_end_flush();
                exit();
            }
            
            $email = $data['email'];
            $password = $data['password'];
            
            error_log('Attempting login for email: ' . $email);
            
            // Get student by email - must have approved status
            $stmt = $pdo->prepare("SELECT * FROM students WHERE email = ? AND status = 'approved'");
            $stmt->execute([$email]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$student) {
                error_log('Student not found or not approved for email: ' . $email);
                echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
                ob_end_flush();
                exit();
            }
            
            // Verify password
            $storedPassword = $student['portal_password'];
            if (!$storedPassword) {
                error_log('Student has no portal password set');
                echo json_encode(['success' => false, 'message' => 'Portal access not configured. Contact admin.']);
                ob_end_flush();
                exit();
            }
            
            // Check if password matches
            if (!password_verify($password, $storedPassword)) {
                error_log('Password verification failed for email: ' . $email);
                echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
                ob_end_flush();
                exit();
            }
            
            // Password is correct - return student data
            error_log('Login successful for email: ' . $email);
            $_SESSION['student_id'] = $student['id'];
            $_SESSION['role'] = ($student['email'] === 'admin@university.local' || $student['email'] === 'admin@biringan.edu') ? 'admin' : 'student';
            $response = [
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $student['id'],
                    'email' => $student['email'],
                    'name' => $student['first_name'] . ' ' . $student['last_name'],
                    'first_name' => $student['first_name'],
                    'last_name' => $student['last_name'],
                    'student_id' => $student['student_id'],
                    'level' => $student['level'],
                    'grade_level' => $student['grade_level'],
                    'strand' => $student['strand'],
                    'voucher_eligibility' => $student['voucher_eligibility'],
                    'section' => $student['class_section'],
                    'status' => $student['status'],
                    'role' => $_SESSION['role']
                ]
            ];
            echo json_encode($response);
            ob_end_flush();
            exit();
            
        } catch (Exception $e) {
            error_log('Exception in login: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Login failed: ' . $e->getMessage()]);
            ob_end_flush();
            exit();
        }
    } elseif ($action === 'updateStatus') {
        // Handle status update for enrollment approval/rejection
        $data = json_decode(file_get_contents('php://input'), true);
        error_log('updateStatus endpoint reached');
        try {
            // Update student status with approval workflow
            $rawInput = file_get_contents('php://input');
            error_log('Raw POST input: ' . $rawInput);
            $data = json_decode($rawInput, true);
            error_log('Received data: ' . json_encode($data));
            
            if (!isset($data['studentId']) || !isset($data['status'])) {
                error_log('Missing required fields');
                echo json_encode(['success' => false, 'message' => 'Missing required fields']);
                return;
            }
            
            $studentId = $data['studentId'];
            $status = $data['status'];
            $studentEmail = $data['email'] ?? null;
            error_log('Processing student ID: ' . $studentId . ' with status: ' . $status . ' email: ' . $studentEmail);
            
            // Get student info
            $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ?");
            $stmt->execute([$studentId]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$student) {
                error_log('Student not found with ID: ' . $studentId);
                echo json_encode(['success' => false, 'message' => 'Student not found']);
                return;
            }
            
            // Use provided email or fall back to student's email
            $email = $studentEmail ?? $student['email'];
            
            if ($status === 'approved') {
                error_log('Approving student');
                // Generate student ID
                $year = date('Y');
                $levelCode = strtoupper(substr($student['level'], 0, 3));
                $randomNum = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
                $studentIdNum = "{$year}-{$levelCode}-{$randomNum}";
                
                // Use default portal password for all students
                $portalPassword = 'password123';
                $portalPasswordHash = password_hash($portalPassword, PASSWORD_DEFAULT);
                
                // Assign class section based on level and strand
                $section = $data['section'] ?? '';
                if (empty($section)) {
                    if (strpos($student['level'], 'senior') !== false) {
                        $strandCode = strtoupper(substr($student['strand'] ?? 'XX', 0, 2));
                        $section = "SHS-{$strandCode}-" . chr(rand(65, 68));
                    } else {
                        $section = "JHS-" . ($student['grade_level'] ?? '7') . "-" . chr(rand(65, 68));
                    }
                }
                
                error_log('Generated student ID: ' . $studentIdNum . ' Section: ' . $section . ' Email: ' . $email);
                
                // Update student with approval details including email for account creation
                $updateStmt = $pdo->prepare("
                    UPDATE students 
                    SET status = ?, 
                        student_id = ?, 
                        portal_access = 1, 
                        portal_password = ?, 
                        class_section = ?, 
                        approved_at = NOW(),
                        email = ?
                    WHERE id = ?
                ");
                $result = $updateStmt->execute([$status, $studentIdNum, $portalPasswordHash, $section, $email, $studentId]);
                
                error_log('Update result: ' . ($result ? 'success' : 'failed'));
                error_log('Rows affected: ' . $updateStmt->rowCount());
                
                if ($result && $updateStmt->rowCount() > 0) {
                    $response = [
                        'success' => true, 
                        'message' => 'Student approved successfully',
                        'studentId' => $studentIdNum,
                        'portalPassword' => $portalPassword,
                        'section' => $section,
                        'email' => $email
                    ];
                    error_log('Sending response: ' . json_encode($response));
                    echo json_encode($response);
                    ob_end_flush();
                    exit();
                } else {
                    error_log('Failed to update student record');
                    echo json_encode(['success' => false, 'message' => 'Failed to update student record']);
                    ob_end_flush();
                    exit();
                }
                
            } elseif ($status === 'rejected') {
                $reason = $data['reason'] ?? 'No reason provided';
                
                $updateStmt = $pdo->prepare("UPDATE students SET status = ? WHERE id = ?");
                $updateStmt->execute([$status, $studentId]);
                
                echo json_encode(['success' => true, 'message' => 'Student rejected successfully']);
                ob_end_flush();
                exit();
                
            } else {
                // Just update status
                $updateStmt = $pdo->prepare("UPDATE students SET status = ? WHERE id = ?");
                $updateStmt->execute([$status, $studentId]);
                echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
                ob_end_flush();
                exit();
            }
            
        } catch (Exception $e) {
            error_log('Exception in updateStatus: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to update status: ' . $e->getMessage()]);
            ob_end_flush();
            exit();
        }
    } elseif ($action === 'add_course') {
        try {
            $code = $data['code'] ?? $data['course_code'] ?? '';
            $name = $data['name'] ?? $data['course_name'] ?? '';
            $description = $data['description'] ?? '';
            
            if (empty($code) || empty($name)) {
                echo json_encode(['success' => false, 'message' => 'Missing required fields: code and name']);
                ob_end_flush();
                exit();
            }
            $stmt = $pdo->prepare("INSERT INTO courses (code, name, description) VALUES (?, ?, ?)");
            $stmt->execute([$code, $name, $description]);
            echo json_encode(['success' => true, 'message' => 'Course added successfully']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
        ob_end_flush();
        exit();
    } elseif ($action === 'delete_course') {
        try {
            if (empty($data['id'])) {
                echo json_encode(['success' => false, 'message' => 'Missing course ID']);
                ob_end_flush();
                exit();
            }
            $stmt = $pdo->prepare("DELETE FROM courses WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true, 'message' => 'Course deleted successfully']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
        ob_end_flush();
        exit();
    } elseif ($action === 'change_password') {
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            if (!isset($_SESSION['student_id'])) {
                echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
                ob_end_flush();
                exit();
            }
            
            $studentId = $_SESSION['student_id'];
            $currentPassword = $data['currentPassword'] ?? '';
            $newPassword = $data['newPassword'] ?? '';
            
            if (empty($currentPassword) || empty($newPassword)) {
                echo json_encode(['success' => false, 'message' => 'Current password and new password are required.']);
                ob_end_flush();
                exit();
            }
            
            // Get student info
            $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ?");
            $stmt->execute([$studentId]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$student) {
                echo json_encode(['success' => false, 'message' => 'User not found.']);
                ob_end_flush();
                exit();
            }
            
            // Verify current password
            $storedPassword = $student['portal_password'];
            if (!$storedPassword || !password_verify($currentPassword, $storedPassword)) {
                echo json_encode(['success' => false, 'message' => 'Invalid current password.']);
                ob_end_flush();
                exit();
            }
            
            // Hash and update to new password
            $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $updateStmt = $pdo->prepare("UPDATE students SET portal_password = ? WHERE id = ?");
            $updateStmt->execute([$newPasswordHash, $studentId]);
            
            echo json_encode(['success' => true, 'message' => 'Password updated successfully.']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to change password: ' . $e->getMessage()]);
        }
        ob_end_flush();
        exit();
    } else {
        error_log('No matching POST endpoint found. Action: ' . $action);
        echo json_encode(['success' => false, 'message' => 'Invalid POST endpoint']);
        ob_end_flush();
        exit();
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'admin_stats') {
        try {
            $totalStudents = $pdo->query("SELECT COUNT(*) FROM students")->fetchColumn();
            $totalEnrollments = $pdo->query("SELECT COUNT(*) FROM students WHERE status = 'approved'")->fetchColumn();
            $totalCourses = $pdo->query("SELECT COUNT(*) FROM courses")->fetchColumn();
            $pendingApplications = $pdo->query("SELECT COUNT(*) FROM students WHERE status = 'pending' OR status = 'under-review'")->fetchColumn();
            
            echo json_encode([
                'success' => true,
                'totalStudents' => (int)$totalStudents,
                'totalEnrollments' => (int)$totalEnrollments,
                'totalCourses' => (int)$totalCourses,
                'pendingApplications' => (int)$pendingApplications
            ]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } elseif ($action === 'get_courses') {
        try {
            $stmt = $pdo->query("SELECT * FROM courses ORDER BY code ASC");
            $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $courses]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } elseif ($action === 'students') {
        // Fetch all students
        try {
            $stmt = $pdo->query("SELECT * FROM students ORDER BY created_at DESC");
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $students]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to fetch students: ' . $e->getMessage()]);
        }
    } elseif ($action === 'pending') {
        // Fetch pending students
        try {
            $stmt = $pdo->query("SELECT * FROM students WHERE status = 'pending' ORDER BY created_at DESC");
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $students]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to fetch pending students: ' . $e->getMessage()]);
        }
    } elseif ($action === 'approved') {
        // Fetch approved students
        try {
            error_log('Fetching approved students');
            $stmt = $pdo->query("SELECT * FROM students WHERE status = 'approved' ORDER BY created_at DESC");
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log('Found ' . count($students) . ' approved students');
            echo json_encode(['success' => true, 'data' => $students]);
        } catch (PDOException $e) {
            error_log('Failed to fetch approved students: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to fetch approved students: ' . $e->getMessage()]);
        }
    } elseif ($action === 'getStudent' && isset($_GET['id'])) {
        // Fetch single student by ID
        try {
            $studentId = $_GET['id'];
            $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ?");
            $stmt->execute([$studentId]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($student) {
                echo json_encode(['success' => true, 'data' => $student]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Student not found']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to fetch student: ' . $e->getMessage()]);
        }
    } elseif ($action === 'current_user') {
        if (isset($_SESSION['student_id'])) {
            try {
                $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ?");
                $stmt->execute([$_SESSION['student_id']]);
                $student = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($student) {
                    echo json_encode([
                        'success' => true,
                        'user' => [
                            'id' => $student['id'],
                            'email' => $student['email'],
                            'name' => $student['first_name'] . ' ' . $student['last_name'],
                            'first_name' => $student['first_name'],
                            'last_name' => $student['last_name'],
                            'student_id' => $student['student_id'],
                            'level' => $student['level'],
                            'grade_level' => $student['grade_level'],
                            'strand' => $student['strand'],
                            'voucher_eligibility' => $student['voucher_eligibility'],
                            'section' => $student['class_section'],
                            'status' => $student['status'],
                            'role' => ($student['email'] === 'admin@university.local' || $student['email'] === 'admin@biringan.edu') ? 'admin' : 'student'
                        ]
                    ]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Student not found']);
                }
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Database error']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'No active session']);
        }
    } elseif ($action === 'logout') {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        echo json_encode(['success' => true]);
    } elseif ($action === 'getGrades') {
        if (!isset($_SESSION['student_id'])) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            ob_end_flush();
            exit();
        }
        $studentId = $_SESSION['student_id'];
        
        try {
            $stmt = $pdo->prepare("SELECT * FROM grades WHERE student_id = ?");
            $stmt->execute([$studentId]);
            $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($grades) === 0) {
                // Fetch student program and strand
                $studentStmt = $pdo->prepare("SELECT level, strand FROM students WHERE id = ?");
                $studentStmt->execute([$studentId]);
                $student = $studentStmt->fetch(PDO::FETCH_ASSOC);
                
                $level = $student['level'] ?? '';
                $strand = $student['strand'] ?? '';
                
                $defaultGrades = [];
                if (strpos($level, 'senior') !== false) {
                    if (strpos($strand, 'stem') !== false) {
                        $defaultGrades = [
                            ['subject' => 'Pre-Calculus / Basic Calculus', 'q1' => 88, 'q2' => 89, 'q3' => 91, 'q4' => 90, 'final' => 89.50, 'remarks' => 'Passed'],
                            ['subject' => 'General Chemistry 1', 'q1' => 85, 'q2' => 87, 'q3' => 86, 'q4' => 88, 'final' => 86.50, 'remarks' => 'Passed'],
                            ['subject' => 'General Physics 1', 'q1' => 84, 'q2' => 86, 'q3' => 85, 'q4' => 87, 'final' => 85.50, 'remarks' => 'Passed'],
                            ['subject' => 'General Biology 1', 'q1' => 90, 'q2' => 91, 'q3' => 92, 'q4' => 90, 'final' => 90.75, 'remarks' => 'Passed'],
                            ['subject' => 'Oral Communication', 'q1' => 92, 'q2' => 94, 'q3' => 93, 'q4' => 95, 'final' => 93.50, 'remarks' => 'Passed'],
                            ['subject' => 'Empowerment Technologies', 'q1' => 94, 'q2' => 95, 'q3' => 96, 'q4' => 95, 'final' => 95.00, 'remarks' => 'Passed']
                        ];
                    } elseif (strpos($strand, 'abm') !== false) {
                        $defaultGrades = [
                            ['subject' => 'Fundamentals of ABM 1', 'q1' => 87, 'q2' => 89, 'q3' => 90, 'q4' => 88, 'final' => 88.50, 'remarks' => 'Passed'],
                            ['subject' => 'Business Math', 'q1' => 85, 'q2' => 86, 'q3' => 88, 'q4' => 87, 'final' => 86.50, 'remarks' => 'Passed'],
                            ['subject' => 'Organization and Management', 'q1' => 89, 'q2' => 90, 'q3' => 91, 'q4' => 92, 'final' => 90.50, 'remarks' => 'Passed'],
                            ['subject' => 'Business Finance', 'q1' => 84, 'q2' => 85, 'q3' => 87, 'q4' => 86, 'final' => 85.50, 'remarks' => 'Passed'],
                            ['subject' => 'Principles of Marketing', 'q1' => 90, 'q2' => 91, 'q3' => 92, 'q4' => 93, 'final' => 91.50, 'remarks' => 'Passed'],
                            ['subject' => 'Applied Economics', 'q1' => 88, 'q2' => 89, 'q3' => 90, 'q4' => 89, 'final' => 89.00, 'remarks' => 'Passed']
                        ];
                    } elseif (strpos($strand, 'humss') !== false) {
                        $defaultGrades = [
                            ['subject' => 'Creative Writing', 'q1' => 90, 'q2' => 91, 'q3' => 92, 'q4' => 91, 'final' => 91.00, 'remarks' => 'Passed'],
                            ['subject' => 'Creative Nonfiction', 'q1' => 88, 'q2' => 89, 'q3' => 91, 'q4' => 90, 'final' => 89.50, 'remarks' => 'Passed'],
                            ['subject' => 'Intro to World Religions', 'q1' => 91, 'q2' => 92, 'q3' => 90, 'q4' => 93, 'final' => 91.50, 'remarks' => 'Passed'],
                            ['subject' => 'Philippine Politics and Governance', 'q1' => 87, 'q2' => 89, 'q3' => 88, 'q4' => 90, 'final' => 88.50, 'remarks' => 'Passed'],
                            ['subject' => 'Disciplines and Ideas', 'q1' => 89, 'q2' => 90, 'q3' => 91, 'q4' => 91, 'final' => 90.25, 'remarks' => 'Passed'],
                            ['subject' => 'Community Engagement', 'q1' => 93, 'q2' => 94, 'q3' => 95, 'q4' => 95, 'final' => 94.25, 'remarks' => 'Passed']
                        ];
                    } elseif (strpos($strand, 'he') !== false) {
                        $defaultGrades = [
                            ['subject' => 'Cookery', 'q1' => 89, 'q2' => 91, 'q3' => 92, 'q4' => 93, 'final' => 91.25, 'remarks' => 'Passed'],
                            ['subject' => 'Bread and Pastry Production', 'q1' => 92, 'q2' => 90, 'q3' => 91, 'q4' => 93, 'final' => 91.50, 'remarks' => 'Passed'],
                            ['subject' => 'Food and Beverage Services', 'q1' => 90, 'q2' => 92, 'q3' => 93, 'q4' => 91, 'final' => 91.50, 'remarks' => 'Passed'],
                            ['subject' => 'Housekeeping', 'q1' => 93, 'q2' => 94, 'q3' => 95, 'q4' => 94, 'final' => 94.00, 'remarks' => 'Passed'],
                            ['subject' => 'Tourism Promotion Services', 'q1' => 88, 'q2' => 90, 'q3' => 89, 'q4' => 91, 'final' => 89.50, 'remarks' => 'Passed'],
                            ['subject' => 'Entrepreneurship', 'q1' => 91, 'q2' => 93, 'q3' => 92, 'q4' => 94, 'final' => 92.50, 'remarks' => 'Passed']
                        ];
                    } else { // default TVL-ICT / TVL-CSS
                        $defaultGrades = [
                            ['subject' => 'Computer Systems Servicing', 'q1' => 90, 'q2' => 91, 'q3' => 93, 'q4' => 92, 'final' => 91.50, 'remarks' => 'Passed'],
                            ['subject' => 'Computer Programming', 'q1' => 88, 'q2' => 89, 'q3' => 91, 'q4' => 90, 'final' => 89.50, 'remarks' => 'Passed'],
                            ['subject' => 'Web Design and Development', 'q1' => 91, 'q2' => 92, 'q3' => 93, 'q4' => 92, 'final' => 92.00, 'remarks' => 'Passed'],
                            ['subject' => 'Animation / Illustration', 'q1' => 93, 'q2' => 92, 'q3' => 94, 'q4' => 95, 'final' => 93.50, 'remarks' => 'Passed'],
                            ['subject' => 'Empowerment Technologies', 'q1' => 95, 'q2' => 94, 'q3' => 96, 'q4' => 95, 'final' => 95.00, 'remarks' => 'Passed'],
                            ['subject' => 'General Mathematics', 'q1' => 86, 'q2' => 87, 'q3' => 89, 'q4' => 88, 'final' => 87.50, 'remarks' => 'Passed']
                        ];
                    }
                } else { // junior-high
                    $defaultGrades = [
                        ['subject' => 'English', 'q1' => 88, 'q2' => 89, 'q3' => 90, 'q4' => 91, 'final' => 89.50, 'remarks' => 'Passed'],
                        ['subject' => 'Mathematics', 'q1' => 84, 'q2' => 86, 'q3' => 85, 'q4' => 88, 'final' => 85.75, 'remarks' => 'Passed'],
                        ['subject' => 'Science', 'q1' => 86, 'q2' => 88, 'q3' => 87, 'q4' => 89, 'final' => 87.50, 'remarks' => 'Passed'],
                        ['subject' => 'Filipino', 'q1' => 91, 'q2' => 92, 'q3' => 93, 'q4' => 94, 'final' => 92.50, 'remarks' => 'Passed'],
                        ['subject' => 'Araling Panlipunan', 'q1' => 89, 'q2' => 90, 'q3' => 91, 'q4' => 92, 'final' => 90.50, 'remarks' => 'Passed'],
                        ['subject' => 'MAPEH', 'q1' => 92, 'q2' => 93, 'q3' => 94, 'q4' => 95, 'final' => 93.50, 'remarks' => 'Passed'],
                        ['subject' => 'EsP / GMRC', 'q1' => 94, 'q2' => 95, 'q3' => 96, 'q4' => 96, 'final' => 95.25, 'remarks' => 'Passed'],
                        ['subject' => 'TLE', 'q1' => 90, 'q2' => 91, 'q3' => 92, 'q4' => 93, 'final' => 91.50, 'remarks' => 'Passed']
                    ];
                }
                
                $insertStmt = $pdo->prepare("INSERT INTO grades (student_id, subject, q1, q2, q3, q4, final, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($defaultGrades as $g) {
                    $insertStmt->execute([
                        $studentId, $g['subject'], $g['q1'], $g['q2'], $g['q3'], $g['q4'], $g['final'], $g['remarks']
                    ]);
                }
                
                $stmt->execute([$studentId]);
                $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            echo json_encode(['success' => true, 'data' => $grades]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
    } elseif ($action === 'getSchedule') {
        if (!isset($_SESSION['student_id'])) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            ob_end_flush();
            exit();
        }
        $studentId = $_SESSION['student_id'];
        
        try {
            $stmt = $pdo->prepare("SELECT * FROM schedules WHERE student_id = ?");
            $stmt->execute([$studentId]);
            $schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($schedule) === 0) {
                // Fetch student program and strand
                $studentStmt = $pdo->prepare("SELECT level, strand, grade_level FROM students WHERE id = ?");
                $studentStmt->execute([$studentId]);
                $student = $studentStmt->fetch(PDO::FETCH_ASSOC);
                
                $level = $student['level'] ?? '';
                $strand = $student['strand'] ?? '';
                $gradeLevel = $student['grade_level'] ?? '7';
                
                $defaultSchedule = [];
                if (strpos($level, 'senior') !== false) {
                    if (strpos($strand, 'stem') !== false) {
                        $defaultSchedule = [
                            ['day' => 'monday', 'subject' => 'Pre-Calculus / Basic Calculus', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 201'],
                            ['day' => 'monday', 'subject' => 'General Chemistry 1', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Lab A'],
                            ['day' => 'monday', 'subject' => 'Practical Research', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Library'],
                            ['day' => 'tuesday', 'subject' => 'General Physics 1', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Lab C'],
                            ['day' => 'tuesday', 'subject' => 'Oral Communication', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Room 202'],
                            ['day' => 'wednesday', 'subject' => 'Pre-Calculus / Basic Calculus', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 201'],
                            ['day' => 'wednesday', 'subject' => 'General Biology 1', 'time' => '2:45 PM - 4:15 PM', 'room' => 'Lab B'],
                            ['day' => 'thursday', 'subject' => 'General Mathematics', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 203'],
                            ['day' => 'thursday', 'subject' => 'Empowerment Technologies', 'time' => '2:45 PM - 4:15 PM', 'room' => 'Computer Lab 1'],
                            ['day' => 'friday', 'subject' => 'General Physics 1', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Lab C']
                        ];
                    } elseif (strpos($strand, 'abm') !== false) {
                        $defaultSchedule = [
                            ['day' => 'monday', 'subject' => 'Fundamentals of ABM 1', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 301'],
                            ['day' => 'monday', 'subject' => 'Business Math', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Room 302'],
                            ['day' => 'monday', 'subject' => 'Organization and Management', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 303'],
                            ['day' => 'tuesday', 'subject' => 'Principles of Marketing', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 305'],
                            ['day' => 'tuesday', 'subject' => 'Applied Economics', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Room 306'],
                            ['day' => 'wednesday', 'subject' => 'Fundamentals of ABM 1', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 301'],
                            ['day' => 'wednesday', 'subject' => 'Business Finance', 'time' => '2:45 PM - 4:15 PM', 'room' => 'Room 304'],
                            ['day' => 'thursday', 'subject' => 'Business Ethics', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 307'],
                            ['day' => 'thursday', 'subject' => 'General Mathematics', 'time' => '2:45 PM - 4:15 PM', 'room' => 'Room 308'],
                            ['day' => 'friday', 'subject' => 'Principles of Marketing', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 305']
                        ];
                    } elseif (strpos($strand, 'humss') !== false) {
                        $defaultSchedule = [
                            ['day' => 'monday', 'subject' => 'Creative Writing', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 401'],
                            ['day' => 'monday', 'subject' => 'Intro to World Religions', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Room 402'],
                            ['day' => 'monday', 'subject' => 'Disciplines and Ideas', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 403'],
                            ['day' => 'tuesday', 'subject' => 'Creative Nonfiction', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 405'],
                            ['day' => 'tuesday', 'subject' => 'Philippine Politics and Governance', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Room 406'],
                            ['day' => 'wednesday', 'subject' => 'Creative Writing', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 401'],
                            ['day' => 'wednesday', 'subject' => 'Community Engagement', 'time' => '2:45 PM - 4:15 PM', 'room' => 'Room 404'],
                            ['day' => 'thursday', 'subject' => 'General Mathematics', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 407'],
                            ['day' => 'thursday', 'subject' => 'Understanding Culture, Society & Politics', 'time' => '2:45 PM - 4:15 PM', 'room' => 'Room 408'],
                            ['day' => 'friday', 'subject' => 'Creative Nonfiction', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 405']
                        ];
                    } elseif (strpos($strand, 'he') !== false) {
                        $defaultSchedule = [
                            ['day' => 'monday', 'subject' => 'Cookery / Culinary Arts', 'time' => '7:30 AM - 10:30 AM', 'room' => 'Kitchen Lab'],
                            ['day' => 'monday', 'subject' => 'Food and Beverage Services', 'time' => '1:00 PM - 3:00 PM', 'room' => 'Dining Hall'],
                            ['day' => 'tuesday', 'subject' => 'Bread and Pastry Production', 'time' => '7:30 AM - 10:30 AM', 'room' => 'Baking Lab'],
                            ['day' => 'tuesday', 'subject' => 'Housekeeping & Tourism', 'time' => '1:00 PM - 3:00 PM', 'room' => 'Tourism Room'],
                            ['day' => 'wednesday', 'subject' => 'Cookery / Culinary Arts', 'time' => '7:30 AM - 10:30 AM', 'room' => 'Kitchen Lab'],
                            ['day' => 'thursday', 'subject' => 'Bread and Pastry Production', 'time' => '7:30 AM - 10:30 AM', 'room' => 'Baking Lab'],
                            ['day' => 'friday', 'subject' => 'Entrepreneurship', 'time' => '8:00 AM - 11:00 AM', 'room' => 'Room 503']
                        ];
                    } else { // default TVL-ICT / TVL-CSS
                        $defaultSchedule = [
                            ['day' => 'monday', 'subject' => 'Computer Systems Servicing', 'time' => '7:30 AM - 9:30 AM', 'room' => 'CSS Lab'],
                            ['day' => 'monday', 'subject' => 'Computer Programming', 'time' => '9:45 AM - 11:45 AM', 'room' => 'Programming Lab'],
                            ['day' => 'monday', 'subject' => 'Web Design & Development', 'time' => '1:00 PM - 2:30 PM', 'room' => 'CSS Lab'],
                            ['day' => 'tuesday', 'subject' => 'Empowerment Technologies', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Computer Lab 1'],
                            ['day' => 'tuesday', 'subject' => 'General Mathematics', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Room 501'],
                            ['day' => 'wednesday', 'subject' => 'Computer Systems Servicing', 'time' => '7:30 AM - 9:30 AM', 'room' => 'CSS Lab'],
                            ['day' => 'wednesday', 'subject' => 'Web Design & Development', 'time' => '1:00 PM - 2:30 PM', 'room' => 'CSS Lab'],
                            ['day' => 'thursday', 'subject' => 'Technical English', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 502'],
                            ['day' => 'friday', 'subject' => 'Computer Programming', 'time' => '9:45 AM - 11:45 AM', 'room' => 'Programming Lab']
                        ];
                    }
                } else { // junior-high
                    $defaultSchedule = [
                        ['day' => 'monday', 'subject' => 'English', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 101'],
                        ['day' => 'monday', 'subject' => 'Mathematics', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Room 102'],
                        ['day' => 'monday', 'subject' => 'Science', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 103'],
                        ['day' => 'tuesday', 'subject' => 'Filipino', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 104'],
                        ['day' => 'tuesday', 'subject' => 'Araling Panlipunan', 'time' => '9:15 AM - 10:45 AM', 'room' => 'Room 105'],
                        ['day' => 'wednesday', 'subject' => 'English', 'time' => '7:30 AM - 9:00 AM', 'room' => 'Room 101'],
                        ['day' => 'wednesday', 'subject' => 'MAPEH', 'time' => '2:45 PM - 4:15 PM', 'room' => 'Gym'],
                        ['day' => 'thursday', 'subject' => 'EsP / GMRC', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 106'],
                        ['day' => 'thursday', 'subject' => 'TLE', 'time' => '2:45 PM - 4:15 PM', 'room' => 'Lab 1'],
                        ['day' => 'friday', 'subject' => 'Science', 'time' => '1:00 PM - 2:30 PM', 'room' => 'Room 103']
                    ];
                }
                
                $insertStmt = $pdo->prepare("INSERT INTO schedules (student_id, day, subject, time, room) VALUES (?, ?, ?, ?, ?)");
                foreach ($defaultSchedule as $s) {
                    $insertStmt->execute([
                        $studentId, $s['day'], $s['subject'], $s['time'], $s['room']
                    ]);
                }
                
                $stmt->execute([$studentId]);
                $schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            $grouped = [
                'monday' => [],
                'tuesday' => [],
                'wednesday' => [],
                'thursday' => [],
                'friday' => []
            ];
            foreach ($schedule as $s) {
                $day = strtolower($s['day']);
                if (array_key_exists($day, $grouped)) {
                    $grouped[$day][] = [
                        'subject' => $s['subject'],
                        'time' => $s['time'],
                        'room' => $s['room']
                    ];
                }
            }
            
            echo json_encode(['success' => true, 'data' => $grouped]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
    } elseif ($action === 'getSubjects') {
        try {
            $stmt = $pdo->query("SELECT * FROM subjects ORDER BY level_strand ASC, name ASC");
            $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $subjects]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
    } elseif ($action === 'addSubject') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            exit();
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO subjects (level_strand, code, name, description) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $input['level_strand'],
                $input['code'],
                $input['name'],
                $input['description']
            ]);
            $input['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'message' => 'Subject added successfully', 'data' => $input]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to add subject: ' . $e->getMessage()]);
        }
    } elseif ($action === 'updateSubject') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            exit();
        }
        try {
            $stmt = $pdo->prepare("UPDATE subjects SET level_strand = ?, code = ?, name = ?, description = ? WHERE id = ?");
            $stmt->execute([
                $input['level_strand'],
                $input['code'],
                $input['name'],
                $input['description'],
                $input['id']
            ]);
            echo json_encode(['success' => true, 'message' => 'Subject updated successfully']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to update subject: ' . $e->getMessage()]);
        }
    } elseif ($action === 'deleteSubject') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            exit();
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM subjects WHERE id = ?");
            $stmt->execute([$input['id']]);
            echo json_encode(['success' => true, 'message' => 'Subject deleted successfully']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to delete subject: ' . $e->getMessage()]);
        }
    }
} else {
    error_log('No matching endpoint found. Action: ' . $action . ' Method: ' . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['success' => false, 'message' => 'Invalid endpoint']);
}

// Ensure response is sent
error_log('Script completed');

// Flush output buffer
ob_end_flush();
flush();
?>
