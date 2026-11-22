# 🧀 La Ratoneta — Arquitectura, Criterios y Roadmap de Fases

> Documento vivo con las decisiones de producto, UX, criterios contables y fases futuras de **La Ratoneta** (`https://la-ratoneta.vercel.app`).

---

## ✅ Estado Actual (Implementado y en Producción)

### 1. Criterio Contable y Financiero
* **100% en Pesos Argentinos (`ARS`):** Todo el tablero, balance y gráficos operan unificados en ARS.
* **Conversión automática de USD a Dólar MEP:** Si se ingresa un gasto en dólares (texto, voz o selector manual), se convierte automáticamente al **Dólar MEP** del día (`dolarapi.com/v1/dolares/bolsa`) y guarda el valor original en `U$S` dentro del detalle (`note`).
* **Regla de Tarjeta de Crédito vs. Resúmenes:**
  * Los consumos con tarjeta se registran **en el momento de la compra** con su categoría real (`CREDITO`).
  * **No** se cargan los pagos de resumen del mes siguiente como gasto nuevo (para no duplicar ni cegar el gráfico de torta).
  * Los resúmenes o movimientos de billeteras se usan para **conciliar** fechas, montos y detectar consumos olvidados.
* **Regla de SUBE:** Se registra **solo la recarga** de SUBE (`SUBE`). Los viajes individuales con saldo SUBE no se anotan. Los viajes pagados directo con QR/NFC sin usar saldo SUBE sí se anotan aparte (`CUENTA` o `CREDITO`).
* **Transferencias entre cuentas propias:** No se registran como gasto (son solo movimientos entre bolsillos propios).

### 2. Taxonomía Limpia
* **7 Categorías:** `Supermercados`, `Frescos & Panadería`, `Comida & Salidas`, `Hogar & Servicios`, `Transporte`, `Salud & Farmacia`, `Cuidado & Varios`.
* **4 Métodos de Pago (origen real del dinero):**
  * `EFECTIVO`: Billetes físicos.
  * `CUENTA`: Dinero en cuenta al instante (Débito, Ripio prepaga NFC, Personal Pay, Mercado Pago, MODO cuenta, Transferencias).
  * `CREDITO`: Tarjetas de crédito (Galicia Visa, Amex, Apple Pay crédito, MODO crédito).
  * `SUBE`: Recargas SUBE.
  * *(La app/billetera específica como "Ripio", "Personal Pay", "Apple Pay" se guarda en el campo `note`)*.

### 3. Ingresos del Hogar & Memoria Histórica
* **Multi-ingreso:** Soporte independiente para `Sueldo` (1, 2 o más), `Jubilación`, `Pensión` y `Otro` (nombre libre), con edición inline, borrado confirmado y reordenamiento (`⬆️`/`⬇️`).
* **Línea de tiempo histórica:** Los ingresos marcados como repetitivos se heredan hacia adelante sin alterar ni sobreescribir los meses pasados. Los ajustes puntuales (ej. aguinaldo/bonos) afectan solo al mes elegido.

### 4. Experiencia de Uso (UX)
* **Carga prioritaria arriba de todo:** Modo `Rápido` (texto libre en cualquier orden + dictado por voz con Siri/micrófono) + Modo `Manual` en el mismo bloque + `Carga masiva`.
* **Edición y borrado seguro:** Lápiz para editar monto/concepto/categoría/método/fecha/detalle y confirmación inline antes de borrar.

### 5. Fase 1 — Backend y Configuración iPhone (`Listo en servidor`)
* Endpoint `/api/webhook` protegido con `WEBHOOK_SECRET` y conectado a Firestore mediante `firebase-admin` (`FIREBASE_SERVICE_ACCOUNT_KEY`).
* Soporta payloads estructurados de **Apple Pay (`merchant`, `amount`, `card`)** y texto dictado por **Siri (`text`)**.
* Escudo anti-duplicados de 24 hs y notificación nativa de confirmación para iPhone.
* Panel de configuración accesible desde el ícono `⚙️` junto al perfil de usuario arriba a la derecha.

---

## 📌 Qué Falta Hacer (Por Fases)

### 🔹 Cierre de Fase 1 — En el iPhone de Gretel (Inmediato)
* [ ] Configurar en el iPhone de Gretel la **Automatización `Transacción (Wallet)`** para Apple Pay (siguiendo los pasos del menú `⚙️`).
* [ ] Configurar el **Atajo de voz `Anotar en Ratoneta`** con Siri para compras en efectivo.
* [ ] Realizar una compra real de prueba y validar la llegada de la notificación de confirmación.
* **Punto a evaluar con el uso real:**
  * Hoy el escudo anti-duplicados de `/api/webhook` bloquea si aparece el mismo monto exacto en las últimas 24 hs. Si en la práctica compra dos veces lo mismo por el mismo valor el mismo día (ej. dos cafés iguales), afinar la regla para comparar **monto + comercio similar** o acortar la ventana de tiempo.

---

### 🔹 Fase 2 — Automatización por Mails (Cobertura Total)
Apple Pay captura pagos apoyando el iPhone en el posnet, pero **no cubre** pagos QR desde el celular (Mercado Pago, MODO), débitos automáticos/servicios (Expensas, Personal Flow, Luz, Gas, Agua) ni apps (Cabify, Uber).

* **Aislamiento de cuentas (Regla estricta):** Todo corre únicamente sobre los correos de la titular (**Gretel**); nunca sobre el Gmail de desarrollo/admin (`gabrieldiaz81@gmail.com`).
* **Implementación recomendada (MVP actual):**
  1. Verificar qué plataformas envían comprobante por mail a Gretel (*Banco Galicia, Mercado Pago, Personal Pay, Ripio, Uber, Cabify*).
  2. Crear filtros en el Gmail de Gretel que etiqueten únicamente esos comprobantes bajo `LaRatoneta`.
  3. Ejecutar un **Google Apps Script** gratuito dentro de su cuenta que envíe esos mails al `/api/webhook`.
* **Reglas de exclusión obligatorias:** Ignorar automáticamente correos que contengan *"resumen de cuenta"*, *"pago de tarjeta"* o *"transferencia a cuenta propia"* para evitar duplicados.
* **Fusión de eventos:** Si un pago entra por Apple Pay y luego llega el mail del banco por el mismo monto, fusionar el detalle sin duplicar el gasto.

---

### 🔹 Fase 3 — Control de Servicios Fijos, Cuotas y Comparativas
* [ ] **Checklist de Gastos Fijos mensuales:** Recordatorio visual para verificar si en el mes ya se cargaron Expensas, Luz, Gas, Agua e Internet (detectando rápido si faltó anotar algún servicio).
* [ ] **Cuotas de Tarjeta de Crédito:** Soporte para compras en cuotas (ej. 3/6/12 cuotas) que proyecte automáticamente la cuota correspondiente en los meses siguientes.
* [ ] **Comparativa mes a mes:** Vista simple de evolución mensual (ej. Noviembre vs. Diciembre) por total gastado y por categoría cuando haya 2+ meses cargados.
* [ ] **Conciliación asistida de resúmenes:** Flujo cómodo para pegar o subir el detalle de un resumen o billetera y corregir fechas/montos faltantes.

---

### 🔹 Fase 4 — Escalado a Producto Multi-Usuario (Cualquier persona con Gmail)
Actualmente la app opera sobre una única bóveda compartida (`/users/primary`) habilitada por lista blanca de emails. Para abrirla a cualquier usuario:

1. **Aislamiento de bóveda por usuario (`/users/{uid}`):**
   * Cada usuario que inicia sesión con Google crea automáticamente su propio espacio privado de gastos e ingresos.
2. **Onboarding de 30 segundos:**
   * Al primer ingreso, pedir el ingreso mensual base para arrancar el tablero listo sin datos ficticios.
3. **Token de Webhook propio por usuario:**
   * Reemplazar el `WEBHOOK_SECRET` global por un token único por usuario almacenado en `/users/{uid}/settings/webhook` para sus Atajos de iPhone.
4. **Casilla mágica de reenvío para Mails (sin auditoría OAuth de Google):**
   * Asignar a cada usuario una dirección única (ej. `gastos-xxxx@ingesta.laratoneta.app`) para que configure un reenvío automático en su Gmail sin que la app pida permisos completos de lectura de bandeja (evitando la certificación CASA Tier 2 de Google).
5. **Libros compartidos (Parejas / Familias):**
   * Sistema de invitación por email para que un titular pueda compartir su libro con otro usuario (como actualmente Gabo y Gretel).
