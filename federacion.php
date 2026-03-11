<?php 
// 1. Configuración de SimpleSAML
$saml_lib_path = '/var/www/simplesaml/src/_autoload.php';
require_once($saml_lib_path);

// --- NUEVO: Incluimos tu conexión a la Base de Datos ---
require_once('bd-pdo.php'); 

$SP_ORIGEN = getenv('SOURCE');
$as = new \SimpleSAML\Auth\Simple($SP_ORIGEN);

// Obliga a iniciar sesión
$as->requireAuth();
$attributes = $as->getAttributes();

// 2. Extraer número de cuenta
$nombre_del_atributo = 'uCuenta'; 

if (isset($attributes[$nombre_del_atributo][0])) {
    $numero_cuenta = $attributes[$nombre_del_atributo][0];
    
    // --- NUEVO: Guardar o actualizar al usuario en la tabla 'usuarios' ---
    try {
        // Si el usuario no existe, lo inserta. Si ya existe, actualiza su 'ultimo_acceso'
        $sql = "INSERT INTO usuarios (numero_cuenta) VALUES (:cuenta) 
                ON DUPLICATE KEY UPDATE ultimo_acceso = CURRENT_TIMESTAMP";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['cuenta' => $numero_cuenta]);
    } catch (PDOException $e) {
        // Guardamos el error silenciosamente para no interrumpir el login del usuario
        error_log("Error al guardar usuario en BD: " . $e->getMessage());
    }
    // ----------------------------------------------------------------------

    // Redirigimos a la app mandando el número de cuenta por la URL
    header("Location: app.html?status=success&cuenta=" . urlencode($numero_cuenta));
    exit();
} else {
    echo "<h1>Error</h1><p>No se encontró el número de cuenta.</p>";
    foreach ($attributes as $key => $value) {
        echo $key . " => " . $value[0] . "<br>";
    }
}
?>