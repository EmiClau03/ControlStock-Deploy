# Guía de Despliegue en Railway (Forma más Económica)

He optimizado el proyecto para que la Landing Page, el Panel de Administración (React/Vite) y el Backend (Express + Base de Datos SQLite) se ejecuten en **un solo contenedor** (servicio). Esto significa que **solo pagas por 1 servicio**.

## Pasos para subir el proyecto a Railway:

1. **Subir el código a GitHub**:
   - Crea un repositorio en tu cuenta de GitHub y sube todo el contenido de la carpeta `manejo_stock`.
   - (El archivo `.gitignore` que preparé automáticamente quitará `node_modules` y bases de datos locales para que no se suban por error).

2. **Crear el Proyecto en Railway**:
   - Entra a [Railway.app](https://railway.app) e inicia sesión con GitHub.
   - Haz clic en **"New Project"** -> **"Deploy from GitHub repo"**.
   - Selecciona el repositorio de tu proyecto (`manejo_stock`).
   - Railway detectará automáticamente que es un proyecto de Node.js e instalará y construirá todo solo (gracias al archivo `package.json` que dejé en la raíz).

3. **Configurar el Disco Persistente (IMPORTANTE)**:
   - Como estamos usando una base de datos SQLite y guardando fotos localmente, si no haces esto todos los datos se borrarán cuando Railway actualice tu app.
   - Ve a tu servicio recién creado en Railway, entra a la pestaña **Volumes** y haz clic en **"Add Volume"**. Llámalo por ejemplo `app-data`.
   - Luego, ve a la pestaña **Variables** de tu servicio y agrega una nueva variable de entorno:
     - Variable Name: `DATA_DIR`
     - Value: `/data` (o la ruta donde se haya montado tu volumen en Railway, suele ser `/mount/app-data` o `/data`). *Si usaste Railway Volumes Panel, ahí mismo te dice el "Mount Path", en general es copiar ese path*.
   
4. **URLs del Proyecto**:
   - Railway te generará automáticamente un dominio público en la pestaña **Settings** > **Domains**.
   - **Página de Inicio (Catálogo / Landing)**: `https://[tu-app].up.railway.app/`
   - **Panel de Control de Stock**: `https://[tu-app].up.railway.app/admin`

¡Y listo! Al hacerlo de esta manera economizas al máximo y mantienes todo tu código centralizado.
