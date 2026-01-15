# MineConnect SAT

Este es un monorepo que contiene la aplicación web y la aplicación móvil para el sistema de seguimiento SAT de MineConnect.

## Requisitos

- Node.js (v18 o superior)
- npm

## Configuración

Hay dos proyectos en este repositorio:

- `sat` (aplicación web)
- `mobile` (aplicación móvil)

Ambos proyectos requieren un archivo `.env` con las credenciales para Supabase y Gemini.

### Aplicación Web

1.  Navegue al directorio raíz del proyecto.
2.  Cree un archivo llamado `.env` y agregue las siguientes variables:

    ```
    VITE_SUPABASE_URL="https://your-project-id.supabase.co"
    VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
    VITE_GEMINI_API_KEY="your-gemini-api-key"
    ```

    Reemplace los valores con sus credenciales reales de Supabase y Gemini.

### Aplicación Móvil

1.  Navegue al directorio `mobile`.
2.  Cree un archivo llamado `.env` y agregue las siguientes variables:

    ```
    EXPO_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
    EXPO_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
    EXPO_PUBLIC_GEMINI_API_KEY="your-gemini-api-key"
    ```

    Reemplace los valores con sus credenciales reales de Supabase y Gemini.

## Instalación y Ejecución

### Aplicación Web

1.  Navegue al directorio raíz del proyecto.
2.  Instale las dependencias: `npm install`
3.  Inicie el servidor de desarrollo: `npm run dev`
4.  Abra su navegador y vaya a `http://localhost:5173` (o el puerto que se indique en la terminal).

### Aplicación Móvil

1.  Navegue al directorio `mobile`.
2.  Instale las dependencias: `npm install`
3.  Inicie el servidor de desarrollo de Expo: `npm start`
4.  Escanee el código QR con la aplicación Expo Go en su teléfono (Android) o la aplicación de Cámara (iOS).

## Generación de Instaladores

### Android (.apk)

1.  Asegúrese de que su aplicación esté configurada correctamente en `app.json`.
2.  Navegue al directorio `mobile`.
3.  Ejecute el siguiente comando para generar el APK: `eas build -p android --profile preview` (requiere tener `eas-cli` instalado globalmente: `npm install -g eas-cli`).

### iOS (.ipa)

1.  La generación de un instalador de iOS es más compleja y requiere una cuenta de desarrollador de Apple.
2.  Asegúrese de que su aplicación esté configurada correctamente en `app.json`.
3.  Navegue al directorio `mobile`.
4.  Ejecute el siguiente comando para iniciar el proceso de compilación: `eas build -p ios --profile preview` (requiere tener `eas-cli` instalado globalmente: `npm install -g eas-cli`).
5.  Siga las instrucciones en la terminal.

**Nota:** Dado que no puedo ejecutar comandos de instalación o compilación, no he podido verificar que la aplicación funcione correctamente. La información anterior se basa en el análisis del código y la estructura del proyecto.