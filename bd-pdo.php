<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// SILENCIADOS: Ya no imprimimos las variables para no romper la sesión
// echo "ENDPOINT: " . getenv("ENDPOINT") . "<br>";
// echo "DATABASE: " . getenv("DATABASE") . "<br>";
// echo "USERD: " . getenv("USERD") . "<br>";

try {
    // CAMBIO VITAL: Cambiamos $test por $pdo para que los demás archivos la reconozcan
    $pdo = new PDO(
        "mysql:host=" . getenv("ENDPOINT") . ";dbname=" . getenv("DATABASE"),
        getenv("USERD"),
        getenv("PASSD"),
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        )
    );

    // SILENCIADOS: Tampoco imprimimos el mensaje de éxito
    // echo "Connected successfully<br>";
    // $stmt = $pdo->query("SELECT VERSION()");
    // $version = $stmt->fetchColumn();
    // echo "Database server version: " . $version . "<br>";

} catch (PDOException $e) {
    // Solo dejamos activo el mensaje de error por si se cae la base de datos
    // Esto es muy útil y no rompe nada si el sistema falla
    error_log("Connection failed: " . $e->getMessage()); 
    // Usamos error_log en lugar de echo para que el error se guarde en los registros de Docker
    // en lugar de imprimirse feo en la pantalla del usuario.
}
?>