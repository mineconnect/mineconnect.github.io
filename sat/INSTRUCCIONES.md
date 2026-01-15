# Instrucciones para la Puesta en Marcha del Proyecto SAT

## 1. Configuración de Credenciales (¡MUY IMPORTANTE!)

Ambas aplicaciones (web y móvil) necesitan conectarse a servicios externos como Supabase (para la base de datos y autenticación) y Gemini (para las funciones de IA). Sin estas credenciales, las aplicaciones **no funcionarán**.

Debe crear dos archivos `.env` y rellenarlos con sus claves de API.

### a) Para la Aplicación Web (Panel de Control)

1.  En la carpeta raíz del proyecto (`/`), cree un archivo llamado `.env`.
2.  Copie y pegue el siguiente contenido, reemplazando los valores de ejemplo con sus credenciales reales:

    ```
    VITE_SUPABASE_URL="https://your-project-id.supabase.co"
    VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
    VITE_GEMINI_API_KEY="your-gemini-api-key"
    ```

### b) Para la Aplicación Móvil (App del Conductor)

1.  En la carpeta `mobile/`, cree un archivo llamado `.env`.
2.  Copie y pegue el siguiente contenido, reemplazando los valores de ejemplo con sus credenciales reales:

    ```
    EXPO_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
    EXPO_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
    EXPO_PUBLIC_GEMINI_API_KEY="your-gemini-api-key"
    ```

## 2. Puesta en Marcha de la Aplicación Web

La aplicación web es un panel de control para monitorear los vehículos en un mapa, administrar la flota y usar herramientas de IA.

1.  **Abra una terminal en la raíz del proyecto.**
2.  **Instale las dependencias:**
    ```bash
    npm install
    ```
3.  **Inicie el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
4.  Abra su navegador y vaya a la dirección que se indica en la terminal (normalmente `http://localhost:5173`).

## 3. Puesta en Marcha y Compilación de la Aplicación Móvil

La aplicación móvil es la que los conductores usarán para reportar su ubicación GPS.

1.  **Abra una terminal y navegue a la carpeta `mobile/`:**
    ```bash
    cd mobile
    ```

2.  **Instale las dependencias:**
    ```bash
    npm install
    ```

### Para Probar en su Teléfono (Modo Desarrollo)

3.  **Inicie el entorno de desarrollo de Expo:**
    ```bash
    npm start
    ```
4.  Se mostrará un código QR. Escanéelo con la aplicación "Expo Go" (disponible en la App Store y Play Store) para abrir la app en su teléfono.

### Para Generar los Instaladores (.apk para Android, .ipa para iOS)

He preparado la configuración de la aplicación móvil para su compilación. Para generar las aplicaciones instalables, por favor siga estos pasos:

5.  **Asegúrese de haber iniciado sesión en su cuenta de Expo:**
    (Si no tiene una, puede crearla gratis en [https://expo.dev/](https://expo.dev/))
    ```bash
    npx expo login
    ```

6.  **Compile la aplicación para Android y/o iOS:**
    Este comando subirá su proyecto a los servidores de Expo Application Services (EAS) y lo compilará.
    
    **Para Android:**
    ```bash
    eas build --platform android
    ```
    
    **Para iOS:**
    ```bash
    eas build --platform ios
    ```

7.  **Descargue e instale:**
    Una vez que la compilación se complete, obtendrá un enlace para descargar el archivo de instalación de su aplicación.

---

**Nota Importante:**

Debido a las restricciones del entorno, no he podido instalar dependencias ni ejecutar los proyectos. Por lo tanto:

-   No he podido verificar empíricamente que todo funcione como se espera. Las correcciones y estas instrucciones se basan en un análisis estático del código.
-   No puedo realizar cambios estéticos en la aplicación web, ya que necesito verla en funcionamiento para hacer ajustes de diseño.
-   No puedo subir automáticamente los cambios a GitHub. Deberá hacerlo usted manualmente después de realizar los pasos anteriores.

Es crucial que complete las credenciales en los archivos `.env` y ejecute los comandos de instalación y desarrollo para que los proyectos puedan funcionar y usted pueda realizar los ajustes estéticos deseados.
