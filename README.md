# La Ratoneta 🧀 — Control Diario de Gastos con la Ratita Tierna

<p align="center">
  <img src="public/ratita.svg" alt="La Ratoneta Mascot" width="130" />
</p>

Aplicación web diseñada especialmente para registrar y centralizar gastos diarios en Argentina (efectivo, Mercado Pago, MODO, bancos, transporte y servicios) con estética **Neo-Brutalism** (fondo amarillo vibrante, bordes gruesos de alto contraste y sombras duras).

**Repositorio Oficial:** [github.com/rgabrieldiaz/LaRatoneta](https://github.com/rgabrieldiaz/LaRatoneta)

Diseñada e ideada en **Google Stitch** (Proyecto: *MisGastos — Neo-Brutalist Expense Tracker*).

---

## ⚡ Características Principales

1. **Carga Ultra-Rápida tipo Keep / Notas:**
   - Input inteligente que detecta texto rápido: `chino 19510`, `panaderia 700`, `uber 4500`, `tarjeta 0,99 dol`.
   - Soporte para dictado por voz (Web Speech API).
   - Atajos directos a sus comercios más frecuentes (🥡 Chino, 🥬 Verdulería, 🥖 Panadería, 🥩 Carnicería, 🚗 Cabify, 🚌 SUBE).

2. **Pegar Lote Completo de Google Keep:**
   - Modal donde puede copiar y pegar toda la lista acumulada de la semana.
   - Parser heurístico que detecta montos, entidades argentinas y divide automáticamente en pesos (ARS) y dólares (USD).

3. **Bandeja de Pendientes Automáticos (Webhook Ingestion):**
   - Para pagos de Mercado Pago QR, MODO y notificaciones push.
   - Llegan a la bandeja como pendientes y se confirman con un solo tap.

4. **Desglose Bimonetario y Presupuesto:**
   - Soporta simultáneamente **ARS** y **USD** (tarjetas internacionales como Visa y Amex).
   - Barra de consumo de presupuesto mensual, promedio de gasto diario y desglose por categorías.

5. **Exportación a CSV / Excel:**
   - Descarga de todos los movimientos en un solo clic.

---

## 🚀 Cómo ejecutar localmente

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en el navegador
# http://localhost:3000
```

---

## ☁️ Cómo subir a GitHub y desplegar en Vercel

### 1. Crear el repositorio en GitHub
```bash
git remote add origin https://github.com/TU_USUARIO/mis-gastos.git
git branch -M main
git push -u origin main
```

### 2. Desplegar en Vercel
1. Ingresá a [vercel.com](https://vercel.com) y vinculá tu cuenta de GitHub.
2. Hacé clic en **Add New... > Project** y seleccioná el repositorio `mis-gastos`.
3. Hacé clic en **Deploy**. ¡Listo en 30 segundos!

---

## 🤖 ¿De dónde obtener los datos automáticamente? (Estrategia "On Steroids")

En Argentina, las apps bancarias y billeteras virtuales personales (Mercado Pago, MODO, bancos) **no ofrecen APIs públicas abiertas** para usuarios finales. Sin embargo, se automatizan de 3 formas:

| Canal | Método | Para qué tipo de gasto |
|---|---|---|
| **Push Android (MacroDroid)** | Lee las notificaciones del teléfono ("Pagaste $... con QR") y hace POST a `/api/webhook` | Mercado Pago QR, MODO, transferencias bancarias |
| **Gmail (Google Apps Script)** | Script periódico que busca recibos de compras digitales y hace POST a `/api/webhook` | Cabify, Uber, Personal, Expensas, compras online |
| **Carga Rápida / Keep** | Atajo en la pantalla del celular o pegar texto de Keep en lote | Chino, Verdulería, Panadería, Carnicería (Efectivo / Cash) |

### Endpoint Webhook:
```http
POST /api/webhook
Content-Type: application/json

{
  "title": "Big Pons",
  "amount": 23200,
  "currency": "ARS",
  "method": "MERCADO_PAGO",
  "note": "Notificación push MP"
}
```
