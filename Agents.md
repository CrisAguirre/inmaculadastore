# Listore / La Inmaculada — Contexto del Proyecto (AGENTS.md)

> Raíz frontend: `inmaculadastore/` (Angular 16). Backend: `../libkn/` (Express 5 + Mongoose 9).
> No existía `agents.md` previo: este archivo es la fuente de contexto creada el 2026-09-22.

## 1. Qué es
Sistema comercial "La Inmaculada": POS + inventario + compras/proveedores + caja/cierres +
gastos/finanzas + deudores + reportes + escáner visual + vitrina pública.

## 2. Estructura
```
listore/
├── inmaculadastore/   # Frontend Angular 16.1.7 (Vercel). core/ features/ shared/
│   └── src/app/features/: auth, dashboard, pos, inventory, purchases, suppliers,
│       cash, expenses, finance, debtors, reports, scanner, storefront, settings, alerts
└── libkn/             # Backend Express 5 (Railway). server.js → /api/*
    ├── src/routes/: auth, products, categories, sales, cash-closings, alerts, reports,
    │   storefront, settings, preload, suppliers, purchases, expenses, finance, debtors, scanner
    ├── src/models/: User, Product, Category, Sale, Purchase, Supplier, Expense,
    │   CashClosing, Debtor, Alert, Settings, StockCount (nuevo, auditoría de conteos)
    └── scanner/: api.py (Flask YOLO), train.py, scan.py, dataset/data.yaml, assets/inventario/
```
- Roles `User`: `admin, cajero, cliente, invitado, operador` (default `cajero`).
- `Product`: name, barcode (unique sparse), category*, supplier, purchasePrice, salePrice,
  stock, minStock, imageUrl, description. Índices texto + isActive.
- Deploy: frontend Vercel (`vercel.json`), backend Railway (`railway.json`).

## 3. Módulo Scanner / Contador de existencias (estado tras refactor 2026-09-22)
Flujo: subir foto estantería → inferencia YOLO (`scanner/api.py`) → conteos →
confirmación → actualización de stock con auditoría.

### 3.1 Diagnóstico previo (sincero)
No cumplía a cabalidad: fallback silencioso a COCO genérico, sin umbral de confianza,
matching por `includes()` con falsos positivos, overwrite ciego de stock, catálogo de
referencias que solo vivía en memoria, doble inferencia, `localhost:5000` hardcodeado,
sin validación de 10MB ni auditoría.

### 3.2 Refactor aplicado (verificado: py_compile OK, node --check OK, tsc --noEmit limpio)
- **`scanner/api.py`**: exige `weights/best.pt` (500 claro si falta, salvo
  `SCANNER_ALLOW_COCO_FALLBACK=1` que marca `fallback:true`); umbral
  `SCANNER_CONF_THRESHOLD` (default 0.5) con conteo `filtered_low_conf`;
  `products[]` trae `count + confidence + min_confidence`; `/health` reporta
  `model_trained, model_used, threshold`.
- **Backend `scanner.controller.js`**:
  - `SCANNER_URL` / `SCANNER_TIMEOUT_MS` por env; `waitForScannerReady` con reintentos
    en vez de `sleep 3s`.
  - `findProductForDetection()`: barcode exacto → nombre exacto insensible a caso →
    parcial marcado `ambiguous` (adiós al regex ciego).
  - `scanAndUpdateInventory` acepta `products[]` confirmados → **single inference**;
    crea registro `StockCount` por cambio (producto, oldStock, counted, newStock,
    difference, confidence, createdBy).
  - Nuevo `uploadReference` + ruta `POST /scanner/reference/:productId`
    (multer memoria, 10MB) → guarda en `scanner/assets/inventario/<slug>/ref_<ts>.ext`
    y actualiza `Product.imageUrl`.
- **Frontend**:
  - `api.service`: `scanAndUpdateInventory(image, products?)`, `uploadScannerReference()`.
  - `scanner.component`: valida tipo + 10MB, alerta y **bloquea update** con modelo
    genérico, envía conteos confirmados (una inferencia), `Guardar Referencia` sí sube
    al servidor con estado `Subiendo...`; tabla muestra confianza real.
- **`.env.example`**: nuevas vars `SCANNER_PORT, SCANNER_URL, SCANNER_TIMEOUT_MS,
  SCANNER_CONF_THRESHOLD, SCANNER_ALLOW_COCO_FALLBACK`.

### 3.3 Decisión de producto (2026-09-22)
Descartado exigir 50 fotos/producto (inviable, devuelve al conteo manual).
**Nuevo enfoque**: catálogo por similitud — 1 foto limpia por producto (nombres ya
normalizados + `imageUrl` actual) como plantilla; detección genérica de unidades +
clasificación CLIP/embedding contra catálogo; conteo por similitud.
- Mañana: el usuario toma **1 foto frontal por estantería** (paralela, ~1.5m, alta
  resolución, buena luz, traslape 20%, anotar pasillo/categoría).
- Siguiente paso: montar embeddings del catálogo, correr detección sobre esas fotos,
  medir precisión por producto; solo los que fallen pedirán 3–5 fotos extra.

## 4. Endpoints scanner
| Método | Ruta | Auth |
|---|---|---|
| GET | `/api/scanner/status` | Sí |
| GET | `/api/scanner/inventory` | Sí |
| POST | `/api/scanner/start` | admin |
| POST | `/api/scanner/stop` | admin |
| POST | `/api/scanner/scan` `{image}` | Sí |
| POST | `/api/scanner/scan-update` `{image?, products?, update_stock}` | admin/operador |
| POST | `/api/scanner/reference/:productId` form `image` | admin/operador |

## 5. Cómo correr
- Backend: `cd libkn && npm run dev` (levanta Flask automáticamente).
- Entrenamiento clásico (solo si se retoma): `cd scanner && python train.py 50`
  → copiar `weights/train/weights/best.pt` a `weights/best.pt`.
- Vars Python: `SCANNER_CONF_THRESHOLD`, `SCANNER_ALLOW_COCO_FALLBACK`.

## 6. Pendientes
- [ ] Recibir fotos de estanterías y medir precisión del pipeline por similitud.
- [ ] Poblar/validar `Product.imageUrl` para todo el catálogo.
- [ ] Tabla mapeo `clase → productId` si se vuelve a YOLO entrenado.
- [ ] Tests del matching + auditoría `StockCount` en reportes.
