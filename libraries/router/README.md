# Template Router

### Todas las rutas deben comenzar con un /, ejemplo /test
```php
$Router->get('/test', function () {
```

### El callback de las ruta debe tener un die() al final

#### Usando la funcion **responseRequest**
Para activar el die, basta con poner en true el tercer parametro
```php
$Router->get('/test', function () {
  responseRequest(200, 'succces', true, []);
});
```

#### Usando die()
```php
$Router->get('/test', function () {

 echo json_encode(["status"=> 200, "message" => 'succes', "data" => []]);
 die();
});
```

### Si una ruta no se encuentra, existe el metodo default
Esta debe ir despues de la ultima ruta agregada
```php
$Router->dafault(function () {
```
#### Ejemplo

```php
$Router->get('/test', function () {
  responseRequest(200, 'succces', true, []);
});

$Router->dafault(function () {
  responseRequest(404,'API not found',true);
});
```

## Metodos existentes
 GET 
```php
$Router->get('/test', function () {
```
 POST 
```php
$Router->post('/test', function ($req) {
  // Obtener el body
  $body = $req->body;

});
```
 PUT 
```php
$Router->put('/test', function ($req) {
  // Obtener el body
  $body = $req->body;

});
  
```
 DELETE 
```php
$Router->delete('/test/:id_test', function ($req) {
  $idTest = $req->params->id_test;
});
```

## GET con parametros

```php
// v1/test/450
$Router->get('/test/:id_test', function ($req) {
  $idTest = $req->params->id_test;
});

// v1/test/465/events/85
$Router->get('/test/:id_test/events/:id_event', function ($req) {
  $idTest = $req->params->id_test;
  $idEvent = $req->params->id_event;

});
```

## PUT con parametros

```php
// v1/test/524
$Router->put('/test/:id_test', function ($req) {
  $idTest = $req->params->id_test;
  $body = $req->body;

});
```

## Manejo de versiones
Por default se tiene la version 1 (v1).

#### Ejemplo api version 1
 http://localhost/api/v1/test 


```php
// v1/test
$Router->get('/test',function(){

// Cambiar version de rutas
$Router->setRouteVersion('v2');

// v2/test
$Router->get('/test',function(){

```
Todas las rutas que se escriban despues de esa linea de codigo seran version 2

#### Ejemplo api version 2
 http://localhost/api/v2/test 