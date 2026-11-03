/* Dirección del servidor (API) de Lombriferti.
   - Vacío ('')  -> MODO LOCAL: la página funciona sola y guarda los datos en el navegador (demostración).
   - Con dirección -> MODO SERVIDOR: registro, inicio de sesión, catálogo, compras y verificación del QR van al servidor.
   Ejemplos: 'http://localhost:3000/api' (servidor de ejemplo en tu computadora) o 'https://api.lombriferti.mx/api'. */
window.LF_CONFIG = {
  apiUrl: '',
};
