# 🕹️ MANUAL DE USUARIO: XGAMES BARCADE - HORARIOS

Bienvenido al manual oficial de **XGames Barcade - Horarios**, un sistema progresivo (PWA) de gestión de agendas y reservas para máquinas de baile *Pump It Up* en tiempo real, conectado a Firebase Firestore.

Este manual te guiará detalladamente en el uso de la aplicación, tanto desde la perspectiva del **Administrador** como del **Cliente**, destacando las nuevas funcionalidades premium añadidas.

---

## 💾 Compatibilidad y Seguridad de tus Datos

> [!NOTE]
> **¿Afecta esta actualización a los datos existentes?**
> **No.** La actualización ha sido diseñada para ser **100% compatible hacia atrás** (backward-compatible). Los registros de reservas y usuarios que ya tenías en Firebase no se verán alterados ni dañados:
> * Las reservas antiguas simplemente no mostrarán teléfono y se considerarán "Aprobadas" por defecto, cargándose sin problemas.
> * Los perfiles de usuarios existentes mantendrán su usuario y PIN intactos. Si el usuario decide rellenar su perfil social (Nick, Nivel, Canciones), estos campos se sumarán al registro existente en Firestore sin borrar sus credenciales de acceso.
> * El sistema de traslapes y fusión de celdas es puramente visual en el front-end; calcula los espacios ocupados reactivamente sin modificar los registros originales de la base de datos.

---

## 👑 1. Vista de Administrador (`index.html`)

La vista de administración permite el control absoluto del local, gestión de ingresos de dinero y bloqueo de horarios.

### 🔑 1.1 Ingreso al Panel
1. Accede a la URL del sistema de administración.
2. Introduce la contraseña maestra de administrador: `XGAMESROOT`.
3. Una vez autenticado, verás la etiqueta superior en color magenta con el texto: **VISTA DE ADMINISTRADOR**.

### 🛠️ 1.2 Bloqueo de Horarios por Mantenimiento o Eventos
Si una máquina requiere reparación o está reservada para un torneo local:
1. Haz clic en la celda del horario y la máquina que deseas bloquear en el calendario diario.
2. En el modal que aparece, activa el switch **⚠️ Bloquear Horario (Mantenimiento)**.
3. El formulario se adaptará automáticamente:
   * El nombre cambiará por defecto a *"Mantenimiento 🛠️"*.
   * Se ocultarán los campos de teléfono, duración y pago para evitar errores.
4. Haz clic en **Guardar Reserva**.
5. La celda correspondiente se pintará con un patrón diagonal oscuro y un icono de candado neón 🔒 en ambos paneles (cliente y admin), quedando deshabilitada para solicitudes de usuarios.

### 💬 1.3 Notificaciones y Confirmación por WhatsApp
Para avisar a un cliente que su solicitud de reserva ha sido aprobada:
1. Abre una reserva aprobada o pendiente en el calendario.
2. Si el cliente tiene un número registrado (o lo ingresas manualmente en el campo *Teléfono / WhatsApp*), haz clic en el botón verde **🟢 WhatsApp**.
3. El sistema abrirá automáticamente una pestaña de WhatsApp Web/App con un mensaje personalizado y listo para enviar:
   > *"¡Hola Carlos! Tu reserva en XGames Barcade para la máquina Pump It Up LX a las 4:00 PM del día 2026-05-28 ha sido APROBADA con éxito. ¡Prepárate para bailar! 🕹️💃"*

### 📋 1.4 Aprobación y Rechazo de Solicitudes
* **Aprobar:** Haz clic en una reserva pendiente (marcada con bordes naranjas parpadeantes) y presiona **Aprobar**. El sistema guardará el registro y **rechazará/eliminará automáticamente** cualquier otra solicitud en conflicto para esa misma máquina en esa hora exacta para evitar disputas.
* **Rechazar:** Elimina la solicitud de la base de datos para mantener el calendario limpio.
* **💰 Pago:** Puedes marcar la reserva como pagada con el checkbox. Esto añadirá un icono de bolsa de dinero 💰 al bloque del calendario para control de caja.

---

## 👥 2. Vista de Cliente (`cliente.html`)

Diseñada para ser rápida, interactiva y de uso móvil mediante Progressive Web App (PWA).

### 📝 2.1 Registro e Ingreso Simple
1. En la parte superior derecha, haz clic en **Ingresar**.
2. Escribe tu **Nombre de Usuario** (único) y un **PIN de 4 dígitos** fácil de recordar.
   * *Si eres nuevo:* El sistema te registrará automáticamente con esas credenciales.
   * *Si ya existes:* Verifica tu PIN para iniciar sesión.
3. Al loguearte, aparecerá tu nombre subrayado en la cabecera: **Hola, [Usuario]**.

### 📅 2.2 Solicitar una Reserva
1. En la cuadrícula diaria, busca una celda vacía en la máquina y hora de tu preferencia y haz clic en ella.
2. Selecciona la **Duración** deseada (desde 30 minutos hasta 5 horas).
3. Presiona **Enviar Solicitud**. La celda se pintará en color naranja con un patrón parpadeante que indica *"⏱️ Pendiente"* hasta que el administrador del local la apruebe.

### 🛡️ 2.3 Control de Traslapes Automático (Fusión)
* Si solicitas o se aprueba una reserva de larga duración (ej. 2 horas), el bloque visual se expandirá proporcionalmente hacia abajo.
* Las celdas intermedias cubiertas por esta reserva **desaparecerán automáticamente de la vista** y no permitirán ningún clic. Ningún otro cliente podrá solicitar turnos en tu espacio reservado.

### 👤 2.4 Panel de Autogestión ("Mi Cuenta")
Al hacer clic en tu nombre de usuario en la cabecera (**Hola, [Usuario]**), se abrirá tu panel privado con dos pestañas:
1. **Pestaña Reservas:** Muestra el historial completo de tus reservas en tiempo real. 
   * Si tienes solicitudes que aún están **Pendientes** y decidiste cancelar tus planes, verás un botón **Cancelar** que te permite eliminar la solicitud directamente sin depender del administrador.
2. **Pestaña Perfil PIU (Perfil Arcade):** Aquí puedes configurar tu ficha de jugador ciberpunk:
   * **Teléfono / WhatsApp:** Tu número telefónico sin espacios ni símbolos (ej. `521234567890`) para pre-llenar las reservas.
   * **Nick Pump It Up:** Tu alias de jugador para mostrar en pantalla.
   * **Nivel de Juego:** Tu nivel actual en el juego de ritmo (ej. *S18, D19*).
   * **Canciones Favoritas:** Tus temas musicales favoritos de la Pump (ej. *Beethoven Virus, Conflict, Canon D*).

### 🕹️ 2.5 Tarjeta Social / Ficha de Jugador Pública
¡Conoce a la comunidad de baile del local!
* Cualquier cliente que haya iniciado sesión puede hacer clic en cualquier bloque de reserva **Aprobada** en el calendario principal.
* Se desplegará una **Ficha de Jugador** con el Nick, Nivel del jugador y sus canciones favoritas de la persona que reservó ese horario, fomentando retar a otros bailarines o armar partidas colaborativas.

---

## 💡 Consejos de Uso
* **Instalación móvil:** El sistema es una **PWA**. En teléfonos Android e iOS, verás el botón **"Instalar App"** en la barra superior. Haz clic para agregarlo como una app nativa a tu pantalla de inicio con acceso offline.
* **Comprimir Vista (🔍):** Si estás usando una tableta o móvil en modo vertical, haz clic en el icono de la lupa (🔍) en la barra superior para activar la **Vista Compacta**, reduciendo la altura de las celdas para ver más horas simultáneamente en pantalla.
