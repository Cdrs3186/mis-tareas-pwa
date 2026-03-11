// app.js - Lógica de la lista de tareas con sessionStorage (por pestaña) y BD

// Clave para sessionStorage (aislado por pestaña)
const CLAVE_LOCALSTORAGE = "tareas_pwa";
const API_URL = "api-tareas.php";

// Elementos del DOM
const formTarea = document.getElementById('form-tarea');
const inputTarea = document.getElementById('input-tarea');
const listaTareas = document.getElementById('lista-tareas');

// Estado global de tareas y usuario autenticado
let tareas = [];
let usarBD = false; // Bandera para usar BD cuando esté disponible
let usuarioAutenticado = null; // Información del usuario autenticado

// Cargar tareas desde localStorage y luego desde BD al iniciar
document.addEventListener('DOMContentLoaded', () => {
  // Obtener información del usuario autenticado desde SAML
  usuarioAutenticado = extraerDatosUsuarioSAML();
  
  // Si no hay usuario autenticado desde SAML, generar un identificador único local
  if (!usuarioAutenticado) {
    usuarioAutenticado = obtenerOGenerarUsuarioLocal();
    if (usuarioAutenticado) {
      console.log('✓ Usando identificador único local para este usuario');
    } else {
      console.warn('⚠ No hay usuario autenticado, las tareas no se sincronizarán');
    }
  }
  
  // Primero cargar del sessionStorage (cache local de esta pestaña)
  tareas = obtenerTareasDeAlmacenamiento();
  renderizarTareas();
  
  // Mostrar información del usuario (si existe)
  renderUserInfo();

  // Inicializar modal confirm reutilizable y con animaciones
  initConfirmModal();
  
  // Luego intentar cargar desde BD (online)
  if (usuarioAutenticado) {
    cargarTareasDesdeAPI();
    // Intentar sincronizar tareas pendientes locales al iniciar
    setTimeout(syncPendingToAPI, 600);
  }
});

// Extraer datos del usuario desde window.SAML_ATTRIBUTES
function extraerDatosUsuarioSAML() {
  const attrs = window.SAML_ATTRIBUTES || {};
  
  if (!attrs || Object.keys(attrs).length === 0) {
    return null;
  }
  
  let usuarioInfo = {
    username: '',
    email: '',
    nombre_completo: ''
  };
  
  // Intentar obtener username desde diferentes atributos SAML
  const opcionesUsername = ['uid', 'eduPersonPrincipalName', 'mail', 'cn', 'displayName'];
  for (const clave of opcionesUsername) {
    if (attrs[clave] && attrs[clave][0]) {
      usuarioInfo.username = attrs[clave][0];
      break;
    }
  }
  
  // Intentar obtener email
  const opcionesEmail = ['mail', 'email', 'emailAddress'];
  for (const clave of opcionesEmail) {
    if (attrs[clave] && attrs[clave][0]) {
      usuarioInfo.email = attrs[clave][0];
      break;
    }
  }
  
  // Intentar obtener nombre completo
  const opcionesNombre = ['displayName', 'cn', 'name'];
  for (const clave of opcionesNombre) {
    if (attrs[clave] && attrs[clave][0]) {
      usuarioInfo.nombre_completo = attrs[clave][0];
      break;
    }
  }
  
  // Si no hay username, no es un usuario válido
  if (!usuarioInfo.username) {
    return null;
  }
  
  return usuarioInfo;
}

// Generar o recuperar un identificador único para usuario local (cuando no hay SAML)
function obtenerOGenerarUsuarioLocal() {
  const CLAVE_UUID = 'app_usuario_uuid';
  let usuarioInfo = null;
  
  // Intentar recuperar UUID existente
  let uuid = localStorage.getItem(CLAVE_UUID);
  
  // Si no existe, generar uno nuevo
  if (!uuid) {
    uuid = generarUUID();
    localStorage.setItem(CLAVE_UUID, uuid);
  }
  
  usuarioInfo = {
    username: 'local_' + uuid,
    email: '',
    nombre_completo: 'Usuario Local'
  };
  
  return usuarioInfo;
}

// Generar un UUID v4 simple
function generarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Obtener headers con información del usuario para el API
function obtenerHeadersConUsuario() {
  const headers = { 'Content-Type': 'application/json' };
  
  if (usuarioAutenticado) {
    headers['X-Usuario-Info'] = JSON.stringify(usuarioAutenticado);
  }
  
  return headers;
}

// Inicializar modal confirm reutilizable
function initConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  if (!modal) return;
  const titleEl = modal.querySelector('#confirm-title');
  const descEl = modal.querySelector('#confirm-desc');
  const btnOk = modal.querySelector('#confirm-ok');
  const btnCancel = modal.querySelector('#confirm-cancel');
  let activeResolve = null;

  function cleanup() {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    document.removeEventListener('focusin', enforceFocus);
  }

  function enforceFocus(e) {
    if (!modal.contains(e.target)) {
      e.stopPropagation();
      btnOk.focus();
    }
  }

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (activeResolve) { activeResolve(false); cleanup(); activeResolve = null; }
    }
    if (e.key === 'Tab') {
      const focusable = [btnOk, btnCancel];
      if (e.shiftKey && document.activeElement === focusable[0]) {
        e.preventDefault();
        focusable[1].focus();
      } else if (!e.shiftKey && document.activeElement === focusable[1]) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  });

  btnOk.addEventListener('click', () => {
    if (activeResolve) { activeResolve(true); cleanup(); activeResolve = null; }
  });
  btnCancel.addEventListener('click', () => {
    if (activeResolve) { activeResolve(false); cleanup(); activeResolve = null; }
  });

  // Exponer función abierta para usar en cualquier parte
  window.openConfirmModal = function(options) {
    options = options || {};
    titleEl.textContent = options.title || 'Confirmar acción';
    descEl.textContent = options.message || '';
    btnOk.textContent = options.okText || 'Confirmar';
    btnCancel.textContent = options.cancelText || 'Cancelar';
    modal.removeAttribute('aria-hidden');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => btnOk.focus(), 10);
    document.addEventListener('focusin', enforceFocus);
    return new Promise((resolve) => {
      activeResolve = resolve;
    });
  };
}

// Añadir micro-feedback de presión en botones (.btn) con la clase .btn-press
function initButtonPressEffect() {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    btn.classList.add('btn-press');
    function cleanup() {
      btn.classList.remove('btn-press');
      btn.removeEventListener('animationend', cleanup);
    }
    btn.addEventListener('animationend', cleanup);
    // Fallback por si la animación no se dispara
    setTimeout(cleanup, 300);
  });
  // Soporte teclado: activar efecto con Enter o Space en botón enfocado
  document.body.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && document.activeElement && document.activeElement.classList.contains('btn')) {
      const btn = document.activeElement;
      btn.classList.add('btn-press');
      setTimeout(() => btn.classList.remove('btn-press'), 160);
    }
  });
}

// Inicializar micro-animación de botones
initButtonPressEffect();

// Mostrar nombre de usuario proveniente de SAML (window.SAML_ATTRIBUTES)
function renderUserInfo() {
  const userInfoEl = document.getElementById('user-info');
  if (!userInfoEl) return;
  const attrs = window.SAML_ATTRIBUTES || {};

  // Escape simple para seguridad al inyectar en HTML
  function escapeHtml(unsafe) {
    return String(unsafe).replace(/[&<>"'`=\/]/g, function(s){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'})[s];
    });
  }

  // Intentar claves comunes
  const keys = ['displayName', 'cn', 'uid', 'name', 'mail', 'email'];
  let name = '';
  for (const k of keys) {
    if (attrs[k] && attrs[k][0]) { name = attrs[k][0]; break; }
  }
  // Si no hay, tomar el primer atributo disponible
  if (!name) {
    const firstKey = Object.keys(attrs)[0];
    if (firstKey && attrs[firstKey] && attrs[firstKey][0]) name = attrs[firstKey][0];
  }
  if (name) {
    // Usuario autenticado vía SAML
    userInfoEl.innerHTML = 'Conectado como: ' + escapeHtml(name) + ' <a href="logout.php" id="logout-link" class="logout-link">Cerrar sesión</a>';
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmed = await (window.openConfirmModal ? window.openConfirmModal({
          title: 'Confirmar cierre de sesión',
          message: '¿Seguro que quieres cerrar sesión de tu cuenta?',
          okText: 'Sí, cerrar sesión',
          cancelText: 'Cancelar'
        }) : Promise.resolve(confirm('¿Seguro que quieres cerrar sesión?')));
        if (confirmed) {
          try { window.SAML_ATTRIBUTES = {}; } catch (e) {}
          const userInfoEl = document.getElementById('user-info');
          if (userInfoEl) userInfoEl.textContent = '';
          window.location.href = 'logout.php';
        }
      });
    }
  } else if (usuarioAutenticado && usuarioAutenticado.username && usuarioAutenticado.username.startsWith('local_')) {
    // Usuario local (sin SAML)
    const displayName = usuarioAutenticado.nombre_completo || 'Usuario Local';
    userInfoEl.innerHTML = 'Conectado como: ' + escapeHtml(displayName) + ' <button id="reset-user-link" class="logout-link" type="button">Cambiar usuario</button>';
    const resetUserBtn = document.getElementById('reset-user-link');
    if (resetUserBtn) {
      resetUserBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmed = await (window.openConfirmModal ? window.openConfirmModal({
          title: 'Cambiar usuario local',
          message: '¿Generar un nuevo identificador de usuario? Esto creará un nuevo usuario independiente con sus propias tareas.',
          okText: 'Sí, cambiar usuario',
          cancelText: 'Cancelar'
        }) : Promise.resolve(confirm('¿Generar un nuevo identificador de usuario?')));
        if (confirmed) {
          localStorage.removeItem('app_usuario_uuid');
          sessionStorage.removeItem(CLAVE_LOCALSTORAGE);
          tareas = [];
          usuarioAutenticado = obtenerOGenerarUsuarioLocal();
          renderUserInfo();
          renderizarTareas();
          showToast('Nuevo usuario generado, tareas anteriores borradas');
        }
      });
    }
  } else {
    userInfoEl.textContent = '';
  }
}

// Mostrar toast breve para feedback de acciones
function showToast(message, duration = 2200) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('show');
  if (toast._timeout) clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
    toast._timeout = setTimeout(() => { toast.hidden = true; toast._timeout = null; }, 220);
  }, duration);
}

function obtenerTareasDeAlmacenamiento() {
  const tareasGuardadas = sessionStorage.getItem(CLAVE_LOCALSTORAGE);
  return tareasGuardadas ? JSON.parse(tareasGuardadas) : [];
}

function guardarTareasEnAlmacenamiento() {
  sessionStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(tareas));
}

// =====================================================================
// CORRECCIÓN 1: Mejor sincronización BD -> Pantalla
// =====================================================================
async function cargarTareasDesdeAPI() {
  try {
    const respuesta = await fetch(API_URL, {
      method: 'GET',
      credentials: 'same-origin',
      headers: obtenerHeadersConUsuario()
    });
    
    if (respuesta.ok) {
      const datos = await respuesta.json();
      if (datos.success && datos.tareas) {
        const tareasDelAPI = datos.tareas.map(t => ({
          id: t.id,
          texto: t.texto,
          completada: t.completada == 1 || t.completada === true,
          usuario: t.usuario || null,
          nombre_completo: t.nombre_completo || ''
        }));
        
        const tareasActualizadas = [];
        
        // 1. Agregamos lo que dice la Base de Datos (fuente de verdad)
        tareasActualizadas.push(...tareasDelAPI);
        
        // 2. Agregamos SOLO las tareas locales que son nuevas (no tienen ID aún)
        // Esto evita revivir tareas que fueron borradas en la BD.
        for (const tarea of tareas) {
          if (!tarea.id) {
            tareasActualizadas.push(tarea);
          }
        }
        
        tareas = tareasActualizadas;
        usarBD = true;
        guardarTareasEnAlmacenamiento(); 
        renderizarTareas();
        console.log('✓ Tareas cargadas desde BD y sincronizadas, total:', tareas.length);
      }
    } else if (respuesta.status === 401) {
      console.warn('⚠ No autenticado, usando sessionStorage');
      usarBD = false;
    }
  } catch (error) {
    console.warn('⚠ No se pudo conectar a la BD, usando sessionStorage:', error);
    usarBD = false;
  }
}

function renderizarTareas() {
  listaTareas.innerHTML = '';
  if (tareas.length === 0) {
    const liVacio = document.createElement('li');
    liVacio.textContent = "¡No tienes tareas pendientes!";
    liVacio.style.textAlign = "center";
    liVacio.style.opacity = "0.7";
    listaTareas.appendChild(liVacio);
    return;
  }
  tareas.forEach((tarea, indice) => {
    const li = document.createElement('li');
    li.className = 'tarea' + (tarea.completada ? ' completada' : '');
    li.setAttribute('role', 'listitem');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'tarea-checkbox';
    checkbox.checked = tarea.completada;
    checkbox.setAttribute('aria-label', tarea.completada ? 'Tarea completada' : 'Marcar como completada');
    checkbox.addEventListener('change', () => {
      tareas[indice].completada = checkbox.checked;
      guardarTareasEnAlmacenamiento();
      if (usuarioAutenticado && tarea.id) {
          actualizarTareaEnAPI(tarea.id, checkbox.checked);
        }
      renderizarTareas();
    });

    const span = document.createElement('span');
    span.className = 'tarea-texto';
    span.textContent = tarea.texto;

    if (tarea.usuario) {
      const meta = document.createElement('small');
      meta.className = 'tarea-usuario';
      const displayName = tarea.nombre_completo && tarea.nombre_completo.trim() ? tarea.nombre_completo : tarea.usuario;
      meta.textContent = 'por ' + displayName;
      meta.style.marginLeft = '8px';
      meta.style.opacity = '0.75';
      meta.style.fontSize = '0.85em';
      span.appendChild(document.createTextNode(' '));
      span.appendChild(meta);
    }

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'tarea-eliminar btn btn-secondary';
    btnEliminar.setAttribute('aria-label', 'Eliminar tarea');
    btnEliminar.setAttribute('title', 'Eliminar tarea');
    btnEliminar.type = 'button';
    btnEliminar.innerHTML = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-trash"><path d="M3 6h18"></path><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';
    btnEliminar.addEventListener('click', async () => {
      const confirmed = await (window.openConfirmModal ? window.openConfirmModal({
        title: 'Eliminar tarea',
        message: '¿Eliminar esta tarea?',
        okText: 'Eliminar',
        cancelText: 'Cancelar'
      }) : Promise.resolve(confirm('¿Eliminar esta tarea?')));
      if (confirmed) {
        li.classList.add('removing');
        btnEliminar.classList.add('btn-press');

        const doRemove = () => {
          const idTarea = tarea.id;
          const idx = tareas.findIndex(t => (t.id !== undefined ? t.id === idTarea : t === tarea));
          if (idx !== -1) {
            tareas.splice(idx, 1);
            guardarTareasEnAlmacenamiento();
            
            if (idTarea) {
              console.log('Eliminando tarea de BD, ID:', idTarea);
              eliminarTareaEnAPI(idTarea);
            }
            
            renderizarTareas();
            showToast('Tarea eliminada');
          }
        };

        li.addEventListener('animationend', () => doRemove(), { once: true });
        setTimeout(doRemove, 420);
      }
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(btnEliminar);
    listaTareas.appendChild(li);
  });
}

// =====================================================================
// CORRECCIÓN 2: Protección Try/Finally para no bloquear el botón
// =====================================================================
formTarea.addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = inputTarea.value.trim();
  if (texto.length === 0) return;
  
  if (formTarea._enviando) {
    console.warn('⚠ Formulario ya está siendo enviado, ignorando...');
    return;
  }
  
  formTarea._enviando = true;
  
  // Usamos try...finally para asegurar que _enviando siempre vuelva a ser false
  try {
    const nuevaTarea = { 
      texto, 
      completada: false,
      _pending: false,
      _syncing: false
    };
    
    if (usuarioAutenticado) {
      nuevaTarea._syncing = true; 
      
      try {
        const respuesta = await fetch(API_URL, {
          method: 'POST',
          credentials: 'same-origin',
          headers: obtenerHeadersConUsuario(),
          body: JSON.stringify({ texto: nuevaTarea.texto, completada: nuevaTarea.completada })
        });

        if (respuesta.ok) {
          const datos = await respuesta.json();
          if (datos.id) {
            nuevaTarea.id = datos.id; 
            nuevaTarea._pending = false; 
            nuevaTarea.usuario = usuarioAutenticado.username;
            nuevaTarea.nombre_completo = usuarioAutenticado.nombre_completo || '';
            console.log('✓ Tarea creada en BD:', nuevaTarea.id);
          } else {
            nuevaTarea._pending = true; 
          }
        } else {
          nuevaTarea._pending = true; 
          console.warn('⚠ Error al crear tarea en BD:', respuesta.status);
        }
      } catch (error) {
        console.warn('⚠ Error al guardar en BD:', error);
        nuevaTarea._pending = true;
      } finally {
        nuevaTarea._syncing = false;
      }
    } else {
      console.log('ℹ Tarea local (sin sincronización):', texto);
    }
    
    const esDuplicada = tareas.some(t => 
      t.texto === nuevaTarea.texto && 
      !t._pending && 
      t.id === nuevaTarea.id
    );
    
    if (esDuplicada) {
      console.warn('⚠ Tarea duplicada detectada, ignorando...');
      inputTarea.focus();
      return; 
    }
    
    tareas.push(nuevaTarea);
    console.log('📝 Tarea agregada al array. Total:', tareas.length, tareas);
    guardarTareasEnAlmacenamiento();
    renderizarTareas();
    inputTarea.value = '';
    inputTarea.focus();
    
  } finally {
    // Esto se ejecuta SÍ o SÍ, liberando el botón para nuevas tareas
    formTarea._enviando = false;
  }
});

// Sincronizar tareas locales pendientes con la BD
async function syncPendingToAPI() {
  if (!usuarioAutenticado) {
    console.log('ℹ Sync: sin autenticación, nada que sincronizar');
    return;
  }
  
  const pendientes = tareas.filter(t => t._pending === true && !t._syncing);
  
  if (pendientes.length === 0) {
    console.log('ℹ Sync: no hay tareas pendientes');
    return;
  }

  console.log('🔄 Sincronizando', pendientes.length, 'tareas pendientes...');
  let cambios = false;

  for (const tarea of pendientes) {
    try {
      tarea._syncing = true;
      
      const resp = await fetch(API_URL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: obtenerHeadersConUsuario(),
        body: JSON.stringify({ texto: tarea.texto, completada: tarea.completada })
      });
      
      if (resp.ok) {
        const datos = await resp.json();
        if (datos.id) {
          tarea.id = datos.id;
          tarea.usuario = usuarioAutenticado.username;
          tarea.nombre_completo = usuarioAutenticado.nombre_completo || '';
          tarea._pending = false;
          cambios = true;
          console.log('✓ Tarea sincronizada desde local:', tarea.texto, 'ID:', tarea.id);
        } else {
          console.warn('⚠ API retornó sin ID:', datos);
        }
      } else {
        console.warn('⚠ Error al sincronizar, API respondió:', resp.status);
      }
    } catch (err) {
      console.warn('⚠ Sync pendiente falló para tarea:', tarea.texto, err);
    } finally {
      tarea._syncing = false;
    }
  }

  if (cambios) {
    console.log('💾 Guardando cambios del sync...');
    guardarTareasEnAlmacenamiento();
    renderizarTareas();
  }
}

// Reintentar sincronizar al volver online
window.addEventListener('online', () => {
  setTimeout(syncPendingToAPI, 500);
});

// Función para actualizar tarea en la API
async function actualizarTareaEnAPI(id, completada) {
  try {
    await fetch(API_URL, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: obtenerHeadersConUsuario(),
      body: JSON.stringify({ id, completada })
    });
  } catch (error) {
    console.warn('⚠ Error al actualizar en BD:', error);
  }
}

// Función para eliminar tarea en la API
async function eliminarTareaEnAPI(id) {
  try {
    console.log('🗑️  Eliminando tarea del API, ID:', id);
    const respuesta = await fetch(API_URL, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: obtenerHeadersConUsuario(),
      body: JSON.stringify({ id })
    });
    
    if (respuesta.ok) {
      const datos = await respuesta.json();
      console.log('✓ Tarea eliminada de la BD:', datos);
    } else {
      console.warn('⚠ Error al eliminar de BD:', respuesta.status, respuesta.statusText);
    }
  } catch (error) {
    console.warn('⚠ Error al conectar con API para eliminar:', error);
  }
} 