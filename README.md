# IYANAPP ⚽👟 &bull; Planta14 Futsal Femenino

PWA (Progressive Web App) móvil para el control exhaustivo de asistencia a entrenamientos y partidos del equipo de fútbol sala femenino **Planta14**.

🌐 **Acceso Web / PWA en directo:**  
**[https://abraveses-de-tera.github.io/IYANAPP/](https://abraveses-de-tera.github.io/IYANAPP/)**

---

## 🔎 Investigación previa y repositorios de referencia

Antes del desarrollo de **IYANAPP**, se realizó un análisis de las mejores arquitecturas y utilidades de control de asistencia deportiva y laboral en GitHub:

1. **[mbeacom/openleague](https://github.com/mbeacom/openleague)**: Referencia para la gestión de calendarios deportivos y respuesta rápida de asistencia a eventos.
2. **[CiucurDaniel/Sport-Attendace-Manager](https://github.com/CiucurDaniel/Sport-Attendace-Manager)**: Modelo de flujo de trabajo enfocado al entrenador, control de convocatorias y hojas de partido.
3. **[Konete326/Employee-Attendance](https://github.com/Konete326/Employee-Attendance)** & **[mimnets/OpenHRApp](https://github.com/mimnets/OpenHRApp)**: Inspiración para los paneles de estadísticas (porcentajes de asistencia desglosados, semáforo visual verde/amarillo/rojo) y exportación limpia a formatos Excel/CSV.
4. **[danodoms/evento](https://github.com/danodoms/evento)**: Arquitectura PWA ultraligera, optimizada para funcionar 100% offline en pabellones o vestuarios con baja cobertura móvil.

---

## 🌟 Características principales

- **📱 Diseño Mobile-First OLED:** Tema oscuro total (negro puro `#000000`), controles táctiles de gran tamaño, barra inferior ergonómica y sin zoom accidental.
- **📅 Temporada Oficial 2026 / 2027 (01/10/2026 - 31/07/2027):**
  - Generación automática de entrenamientos: **Lunes, Miércoles y Jueves** (distintivo verde neón 🏃).
  - Generación automática de partidos: **Sábados** (distintivo ámbar deportivo ⚽).
  - Posibilidad de añadir sesiones extra o partidos amistosos en cualquier fecha.
- **👥 Plantilla Precargada:**
  - 13 jugadoras iniciales: **Julia, Irene, Laura, Eli, Sheila, Carla, Ocaña, Natalia, Paula, Melody, Lucia, Andrea, Yaralla**.
  - Posibilidad de añadir nuevas jugadoras, editar dorsales y posiciones.
  - Opción de desactivar jugadoras (baja temporal o definitiva) **sin alterar el histórico** ni las estadísticas de partidos previos.
- **⚡ Registro de asistencia rápido y táctil:**
  - Botón táctil grande por jugadora: `✅ ASISTE` / `❌ NO ASISTE`.
  - Botones de acción masiva en 1 toque: `⚡ Todas Presentes` y `❌ Todas Ausentes`.
  - Registro de bajas con motivos rápidos (Lesión, Trabajo, Estudios, Enfermedad, Viaje o texto personalizado).
  - Campos de partido: Rival, marcador/resultado y observaciones tácticas.
  - Guardado reactivo automático continuo.
- **📊 4 Vistas Especializadas:**
  1. **Calendario mensual:** Con semáforo de asistencia (🟢 $\ge 80\%$, 🟡 $50-79\%$, 🔴 $< 50\%$, ⚪ pendiente).
  2. **Vista de sesión (día):** Control detallado de asistencia y notas de la sesión.
  3. **Matriz de equipo:** Tabla interactiva de Jugadoras $\times$ Fechas con columna fija deslizable.
  4. **Estadísticas:** Porcentajes globales y mensuales, desglosando asistencias a entrenos vs asistencias a partidos, ranking motivacional de jugadoras y barras de progreso.
- **📤 Exportación y Compartición en WhatsApp:**
  - Exportar a **Excel (.xlsx)** con libro multihistorial (Resumen, Matriz y Detalle de Sesiones).
  - Exportar a **CSV** compatible con hojas de cálculo.
  - Tarjeta de convocatoria lista para **WhatsApp**: enviar mensaje de texto formateado con un clic o descargar tarjeta gráfica en imagen PNG de alta resolución.
  - Copia de seguridad: Exportar / Importar archivo JSON completo.
- **🔐 Seguridad y Control de Edición (PIN):**
  - Modo Consulta para jugadoras y aficionados (solo lectura).
  - Modo Entrenadora protegido mediante PIN táctil de 4 dígitos (configurable desde Ajustes).
- **☁️ Doble Almacenamiento (LocalStorage + Firebase Firestore):**
  - Funciona 100% de manera autónoma sin necesidad de backend gracias a LocalStorage.
  - Conexión opcional a Firebase Firestore para que todo el cuerpo técnico y jugadoras tengan los datos sincronizados en tiempo real en todos sus dispositivos.

---

## 📲 Cómo instalar la aplicación en el móvil (PWA)

### En Android (Google Chrome)
1. Abre el enlace en Chrome: **[https://abraveses-de-tera.github.io/IYANAPP/](https://abraveses-de-tera.github.io/IYANAPP/)**
2. Aparecerá un aviso en la parte inferior o pulsa en los **tres puntos verticales (⋮)** arriba a la derecha.
3. Selecciona **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**.
4. ¡Listo! IYANAPP aparecerá como una app nativa con el escudo de Planta14, a pantalla completa y sin barra de direcciones.

### En iPhone / iOS (Safari)
1. Abre el enlace en **Safari**: **[https://abraveses-de-tera.github.io/IYANAPP/](https://abraveses-de-tera.github.io/IYANAPP/)**
2. Pulsa en el botón **Compartir** (el icono de un cuadrado con una flecha hacia arriba en la barra inferior).
3. Desliza hacia abajo y pulsa en **"Añadir a la pantalla de inicio"** (icono con un símbolo `+`).
4. Confirma el nombre "IYANAPP" y pulsa **Añadir**.
5. Ya tendrás el icono oficial de Planta14 en tu pantalla de inicio funcionando a pantalla completa.

---

## ☁️ Guía paso a paso: Configurar Firebase Firestore (Sincronización en la Nube)

## ☁️ Sincronización en la Nube (Firebase Firestore)

La aplicación ya viene **preconfigurada de fábrica** en el código con el proyecto oficial de Planta14:
- **Proyecto:** `planta14-asistencia`
- **Dominio:** `planta14-asistencia.firebaseapp.com`
- **Almacenamiento:** `planta14-asistencia.firebasestorage.app`

### ⚠️ Paso imprescindible en Firebase Console (Activar Reglas de Firestore)
Para que Firebase permita guardar y leer los datos entre todos los dispositivos del equipo sin bloquear los permisos:

1. Entra en tu consola de Firebase: **[https://console.firebase.google.com/project/planta14-asistencia/firestore/rules](https://console.firebase.google.com/project/planta14-asistencia/firestore/rules)**
2. Si aún no has creado la base de datos Firestore, pulsa **"Crear base de datos"** (selecciona ubicación `eur3` o `europe-west3`).
3. Ve a la pestaña **Reglas** y pon las siguientes reglas de lectura/escritura:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /iyanapp_teams/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
4. Pulsa **Publicar**.

¡A partir de ese momento, cada vez que cualquier persona del equipo abra la app, se sincronizará automáticamente en tiempo real! Y si en algún momento no hay cobertura en el pabellón, la app sigue funcionando al 100% en modo local y sincroniza al recuperar internet.

---

## 🔒 Seguridad (PIN de Entrenadora)

- El acceso a la edición de asistencias está protegido mediante un PIN numérico privado.
- Para desbloquear la edición, pulsa en el candado `🔒 Consulta` de la cabecera e introduce el PIN en el teclado numérico.
- Para cambiar el PIN en cualquier momento, entra en la pestaña **Ajustes** con el modo entrenadora activo y pulsa **"Cambiar PIN de Seguridad"**.

---

## 🛠️ Tecnologías utilizadas

- **HTML5 Semántico y CSS3 Moderno** (variables CSS personalizadas, Grid, Flexbox, Safe Area Insets).
- **JavaScript Vanilla (ES6+)** sin transpiladores ni dependencias pesadas, carga instantánea en GitHub Pages.
- **Service Worker (Cache API)** para navegación y almacenamiento offline total.
- **Web App Manifest v2** con iconos adaptativos maskables y temas de pantalla completa.
- **SheetJS (xlsx)** para la generación de libros Excel nativos multihistorial.
- **html2canvas** para la exportación de tarjetas gráficas de convocatoria para WhatsApp.
- **Firebase Firestore SDK v10 (Compat)** para reactividad en tiempo real.

---

## 📄 Licencia

Desarrollado para el club de fútbol sala femenino **Planta14**. Código abierto bajo licencia MIT.
