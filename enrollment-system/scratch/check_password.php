<?php
$hash = '$2y$10$IzM1dLTtFxtCcjiadfzGoOIGMIuwEAV2x8YP.xsyy1ubdlrNPs5A.';
$result = password_verify('password123', $hash);
echo "Verify password123: " . ($result ? "VALID" : "INVALID") . "\n";
