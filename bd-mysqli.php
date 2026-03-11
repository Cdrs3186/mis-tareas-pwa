<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
// Datos de conexión a la base de datos
$host = getenv("ENDPOINT"); // Cambia esto si tu base de datos está en un servidor remoto
$usuario = getenv("USERD");
$contrasena = getenv("PASSD");
$base_datos = getenv("DATABASE");

echo "ENDPOINT: " . $host . "<br>";
echo "DATABASE: " . $base_datos . "<br>";
echo "USERD: " . $usuario . "<br>";


// Crear una conexión a la base de datos
$conexion = new mysqli($host, $usuario, $contrasena, $base_datos);

// Verificar si hay errores de conexión
if ($conexion->connect_error) {
    die("Error de conexión: " . $conexion->connect_error);
}

echo "Conexión exitosa a la base de datos";

// Consultar la versión de MySQL
$resultado = $conexion->query("SELECT VERSION() AS version");
if ($resultado) {
    $fila = $resultado->fetch_assoc();
    echo "Versión de MySQL: " . $fila['version'];
} else {
    echo "Error al consultar la versión de MySQL: " . $conexion->error;
}

// Cerrar la conexión
$conexion->close();
?>
