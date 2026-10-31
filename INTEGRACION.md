# Guía de integración (para el equipo de BD, IA y blockchain)

La página funciona sola con `localStorage`. Para conectarla a lo real, hay que reemplazar los puntos de abajo; el resto de la interfaz no cambia.

## Datos guardados hoy (claves de localStorage → tablas sugeridas)
| Clave | Contenido | Tabla MySQL sugerida |
|---|---|---|
| `lf_users` | nombre, email, teléfono, hash de contraseña, rol | `usuarios` |
| `lf_products` | lote, tipo, kg, fecha, precio, stock, desc, origen | `lotes` |
| `lf_orders` | id, num, email, items[{lote,qty,precio,tipo,kg}], total, envio, fecha, pago, dir, **estado** | `pedidos` + `pedido_items` |
| `lf_waste` | id, fecha, prov, tipo, kg, costoKg | `recepcion_residuos` |
| `lf_costs` | id, fecha, concepto, monto | `gastos` |
| `lf_coupons` | code, tipo (pct/fijo), valor, minimo, aplica (todos o tipo), banner, para (emails), activo, usos | `cupones` |
| `lf_watch` | email, key (tipo\|kg) — avisos de reabastecimiento | `avisos_stock` |
| `lf_reviews` | lote, email, stars, text, fecha | `resenas` |
| `lf_admin_code` | código para registrar administradores (validar en el servidor) | `config` |
| `lf_notifs` | para, texto, fecha, leida | `notificaciones` |

Estados de pedido: `pendiente → preparando → enviado → entregado` (o `cancelado`; al cancelar el stock regresa). Cada pedido guarda `hist` = { estado: fecha } con la fecha real de cada cambio, y `descuento`/`cupon` si se usó un cupón.
`origen` en un lote = `id` de una recepción de residuos (trazabilidad del residuo al producto).

## Funciones a reemplazar por llamadas a la API
- `app.js`: `load()/save()` (lotes), `orders()/addOrder()` (pedidos), `notifs()/notify()`.
- `admin.js`: objeto `DB` (`DB.get/DB.set` para residuos y gastos) y los guardados de pedidos en `hooks.pedidos`.
- `login.html`/`app.js`: usuarios y sesiones (hoy el hash de la contraseña se compara en el navegador; con backend debe validarse en el servidor).
- Pagos: hoy simulados. Nunca guardar número completo ni CVV.

## Endpoints REST sugeridos
`GET/POST /api/lotes` · `GET/POST /api/pedidos` · `PATCH /api/pedidos/:id` (estado) · `GET/POST/DELETE /api/residuos` · `GET/POST/DELETE /api/gastos` · `GET /api/reportes?meses=6` · `POST /api/auth/login|registro`.

## IA
- El asistente (`views.asistente` / hook en `app.js`) usa reglas, no IA. Para IA real: enviar el texto (y foto) a su endpoint y mostrar la respuesta en el mismo contenedor.
- La demanda estimada de `Reportes` es un promedio de 3 meses (`datos()` en `admin.js`); se puede sustituir por la predicción del modelo.

## Blockchain
- `loteHash()` en `sha.js` es un SHA-256 local: sirve para detectar cambios en el QR, **no** es blockchain.
- Punto de enlace: al guardar un lote (`hooks.productos`) y al vender (`firstSale`), enviar el hash a la red y, en `verificar.html`, consultar la cadena en lugar de recalcular.
- Parámetros del QR: `l` lote, `t` tipo, `k` kg, `f` fecha, `o` residuos de origen, `v` venta, `h` huella.
