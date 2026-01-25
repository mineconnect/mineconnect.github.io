# MineConnect SAT - Enterprise Edition

Plataforma profesional de rastreo satelital y telemetría avanzada para empresas de transporte.

## 🚀 Características Principales

### 🎯 Panel de Control Premium
- Mapa central interactivo con OpenStreetMap
- Barra lateral elegante con lista de unidades activas
- Filtros de búsqueda por patente
- Estilo "Premium Dark Industrial" (M4)

### 🛠️ Simulador de Conductor Pro
- **Geolocalización REAL** usando `navigator.geolocation.watchPosition`
- Interfaz flotante sólida con bordes redondeados industriales
- Botón central con gradientes dinámicos (Verde/rojo)
- Telemetría en vivo con velocidad en KM/H
- Consola de logs tipo terminal con eventos GPS
- Guardado automático en base de datos

### 📊 Análisis Avanzado de Telemetría
- Historial completo de viajes realizados
- Traza exacta en mapa con Polylines
- Hover con velocidad en cada punto del recorrido
- **Detector automático de paradas** (> 2 minutos en velocidad 0)
- Estadísticas: Duración, Velocidad Máxima y Promedio
- Generación de reportes PDF con un clic

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + Vite + TypeScript
- **Estilos**: Tailwind CSS (configuración personalizada)
- **Iconografía**: Lucide React
- **Mapas**: React-Leaflet + OpenStreetMap
- **Backend**: Supabase (Auth, PostgreSQL, Real-time)
- **Reportes**: jsPDF + html2canvas
- **Animaciones**: Framer Motion

## 📦 Base de Datos Supabase

El sistema utiliza las siguientes tablas con políticas de seguridad (RLS):

```sql
profiles      - Perfiles de usuario por empresa
trips         - Viajes con métricas de velocidad
trip_logs     - Logs GPS con coordenadas y velocidad
```

**Características de seguridad:**
- Row Level Security (RLS) activado
- Cada usuario solo ve datos de su `company_id`
- Políticas granulares por rol (admin/operator/viewer)

## 🎨 Estética y UX

- **Paleta de colores**:
  - Fondo: `#020617` (Dark Primary)
  - Primario: `#3b82f6` (Blue)
  - Acentos: `#10b981` (Emerald)

- **Diseño industrial pesado** con:
  - Animaciones suaves con framer-motion
  - Backdrop-blur en elementos secundarios
  - Interfaz que simula hardware físico
  - Todo el texto en español neutro profesional

## 🔧 Configuración Rápida

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase
```bash
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

### 3. Ejecutar script SQL
Ejecuta el contenido de `supabase_schema.sql` en tu proyecto Supabase.

### 4. Iniciar desarrollo
```bash
npm run dev
```

## 🚀 Despliegue Automático (GitHub Pages)

El flujo de GitHub Actions configura automáticamente:

1. **Build** del proyecto con variables de entorno
2. **Deploy** a la carpeta `sat/` del repositorio principal
3. **GitHub Pages** para distribución estática

### Configuración de Secrets en GitHub:
- `VITE_SUPABASE_URL`: URL de tu proyecto Supabase
- `VITE_SUPABASE_ANON_KEY`: Key pública de Supabase

## 📱 Uso del Simulador Pro

1. **Iniciar Viaje**: Presiona el botón verde para comenzar
2. **Permisos GPS**: Permite acceso a la ubicación del dispositivo
3. **Monitoreo**: Observa velocidad y logs en tiempo real
4. **Finalizar**: Presiona el botón rojo para detener y guardar

## 📊 Generación de Reportes

Desde el panel de historial:
1. Selecciona un viaje completado
2. Visualiza ruta, paradas y estadísticas
3. Haz clic en "Generar Reporte PDF"

## 🛡️ Seguridad Implementada

- Autenticación con Supabase Auth
- Row Level Security (RLS) en todas las tablas
- Aislamiento de datos por `company_id`
- Validación de roles de usuario
- Manejo seguro de credenciales

## 📂 Estructura del Proyecto

```
mineconnect-sat/
├── src/
│   ├── components/
│   │   ├── DriverSimulator.tsx  # Simulador con GPS real
│   │   └── HistoryPanel.tsx     # Análisis de telemetría
│   ├── lib/
│   │   └── supabaseClient.ts    # Cliente Supabase con tipos
│   ├── types/
│   │   └── index.ts             # Definiciones TypeScript
│   └── App.tsx                  # Aplicación principal
├── supabase_schema.sql          # Script SQL completo
└── .github/workflows/           # Deploy automático
```

## 🌟 Características Únicas

### Detector Inteligente de Paradas
- Analiza logs GPS para identificar detenciones
- Marca paradas > 2 minutos en el mapa
- Muestra duración y hora de cada parada

### Telemetría en Vivo
- Captura coordenadas y velocidad reales
- Almacenamiento instantáneo en Supabase
- Cálculo automático de estadísticas

### Reportes Profesionales
- PDF con mapas, rutas y métricas
- Diseño optimizado para impresión
- Generación con un solo clic

---

**MineConnect SAT Enterprise Edition** - El sistema de rastreo satelital más avanzado para flotas de transporte.