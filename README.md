# Sistema de Gestión de Stock - Automotora

Aplicación web ligera para la gestión de vehículos, fotos e importación masiva de datos.

## Estructura del Proyecto

- `/client`: Frontend en React (desarrollado con Vite + Tailwind CSS).
- `/server`: Backend en Node.js (Express + SQLite + Multer).

## Requisitos Previos

- Node.js instalado en tu sistema.

## Instrucciones de Ejecución

### 1. Preparar el Servidor (Backend)
Desde una terminal en la carpeta raíz:
```powershell
cd server
npm install
npm run dev
```
El servidor se ejecutará en `http://localhost:5000`.

### 2. Preparar el Cliente (Frontend)
Desde otra terminal en la carpeta raíz:
```powershell
cd client
npm install
npm run dev
```
La aplicación se abrirá en tu navegador (usualmente en `http://localhost:5173`).

## Funcionalidades Principales

- **Panel de Control**: Visualización clara del stock con búsqueda y filtros por estado.
- **Gestión de Fotos**: Sube múltiples imágenes por vehículo y gestiónalas fácilmente.
- **Importar Excel**: Carga masiva de vehículos desde archivos `.xlsx`.
- **Indicador "Sin Fotos"**: Identifica rápidamente qué vehículos necesitan imágenes.
- **Responsivo**: Diseño adaptado para uso en computadoras y celulares.

## Notas Técnicas
- La base de datos se guarda localmente en `server/database.sqlite`.
- Las fotos se almacenan en `server/uploads/`.
