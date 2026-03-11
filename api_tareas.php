<?php
// Incluimos tu archivo de conexión silencioso
require_once('bd-pdo.php');

// Recibimos los datos que JavaScript manda en formato JSON
$data = json_decode(file_get_contents('php://input'), true);

// Si no llegaron datos, detenemos el proceso
if (!$data) {
    echo json_encode(['error' => 'No se recibieron datos']);
    exit;
}

$accion = $data['accion'];
$tarea = $data['tarea'];
$numero_cuenta = $data['numero_cuenta'];

try {
    if ($accion === 'agregar') {
        // Insertamos la tarea ligada a tu número de cuenta
        $sql = "INSERT INTO mis_tareas (numero_cuenta, tarea) VALUES (:cuenta, :tarea)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['cuenta' => $numero_cuenta, 'tarea' => $tarea]);
        echo json_encode(['status' => 'guardado correctamente']);
        
    } elseif ($accion === 'borrar') {
        // Borramos esa tarea en específico de tu cuenta
        $sql = "DELETE FROM mis_tareas WHERE numero_cuenta = :cuenta AND tarea = :tarea LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['cuenta' => $numero_cuenta, 'tarea' => $tarea]);
        echo json_encode(['status' => 'borrado correctamente']);
    }
} catch (PDOException $e) {
    // Si la base de datos falla, devolvemos el error
    echo json_encode(['error' => $e->getMessage()]);
}
?>