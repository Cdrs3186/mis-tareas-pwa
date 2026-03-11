<?php
// 1. Encendemos el reporte de errores para no ver pantallas blancas
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

try {
    // 2. Cargamos la librería
    require_once('/var/www/simplesaml/src/_autoload.php');

    // 3. Verificamos que la variable de entorno exista
    $SP_ORIGEN = getenv('SOURCE');
    if (!$SP_ORIGEN) {
        die("<h1>Error:</h1> La variable SOURCE no está definida en este archivo.");
    }

    // 4. Conectamos y cerramos sesión
    $as = new \SimpleSAML\Auth\Simple($SP_ORIGEN);
    
    // Ejecutamos el cierre de sesión redirigiendo al inicio
    $as->logout('http://localhost/proyecto/index.html');

} catch (Exception $e) {
    // Si la escuela rechaza el cierre, atrapamos el error aquí
    echo "<h1>Error al cerrar sesión:</h1>";
    echo "<p>" . $e->getMessage() . "</p>";
}
?>