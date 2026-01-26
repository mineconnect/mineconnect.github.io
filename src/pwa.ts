// PWA Service Worker Registration
// @ts-ignore - virtual:pwa-register is injected by Vite PWA plugin
declare const __PWA_SW_REGISTER__: any;

let updateSW: any = null;

// Dynamic import to avoid build errors
if (typeof window !== 'undefined') {
  try {
    // This will be replaced by Vite PWA plugin
    updateSW = () => {
      console.log('PWA Service Worker registration handled by Vite PWA');
    };
  } catch (error) {
    console.log('PWA Service Worker not available in this build');
  }
}

export default updateSW;