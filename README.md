# 🏃‍♂️ Mr. Dash - Arquitectura SaaS
## 👥 Autores

* **María Isabel García Sánchez** - *Desarrollo y Documentación* - [TuGitHub](https://github.com/isabelgs26)
* **Asignatura:** Procesos de Ingeniería del Software (2023-2024)
* **Universidad:** Universidad de Castilla-La Mancha (UCLM)

**Mr. Dash** es una plataforma de juegos web multijugador en tiempo real. Este proyecto implementa una arquitectura SaaS (Software as a Service) escalable, desarrollada como parte de la asignatura **Procesos de Ingeniería del Software**.

El sistema permite a los usuarios registrarse, iniciar sesión y competir en partidas online esquivando obstáculos, utilizando comunicación bidireccional mediante WebSockets.

---

## 🚀 Características Principales

### 👤 Gestión de Usuarios (Sprint 1 & 2)
* **Registro e Inicio de Sesión Local:** Con validación de email y cifrado de contraseñas.
* **OAuth con Google:** Integración completa para iniciar sesión con Google Sign-In y Google One Tap.
* **Seguridad:** Uso de **JWT (JSON Web Tokens)** para la gestión de sesiones seguras y cookies cifradas.

### 🎮 Multijugador en Tiempo Real (Sprint 3)
* **WebSockets (Socket.IO):** Comunicación bidireccional de baja latencia entre cliente y servidor.
* **Creación de Partidas:** Los usuarios pueden crear salas de juego y esperar rivales.
* **Unirse a Partidas:**
    * Mediante código único de partida.
    * Seleccionando desde una lista de partidas disponibles actualizada en tiempo real.
* **Sincronización:** El estado del juego se sincroniza entre ambos navegadores.

## 💻 Tecnologías Utilizadas

* **Backend:** Node.js, Express, Socket.IO, MongoDB Atlas.
* **Frontend:** HTML5, Bootstrap 4, jQuery, Socket.IO Client.
* **Calidad y DevOps:** Playwright (E2E), Google Cloud Platform, GitHub Actions.
