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

## 3. Módulo Scanner / Contador de existencias (estado 2026-10-05: conteo total real)
Flujo YOLO clásico: subir foto → inferencia (`scanner/api.py`) → confirmación →
actualización con auditoría. **Nuevo**: motor automático sin `best.pt`
(`scanner/auto_count.py`: YOLO-World retail + corroboración COCO, tiers
ALTA/MEDIA/BAJA) + sesiones multifoto por zona + **conteo total real 2.373 uds**
(`scanner/conteo_total_final.json/.csv`). Criterio vigente: la foto manda, el
sistema anterior era supuesto (`aplicar_conteo.js --apply` reemplaza stock).

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
| POST | `/api/scanner/scan-auto` `{image|image_path, annotate?}` | Sí |
| POST | `/api/scanner/zone-session` `{photos[≤10], zone?}` | Sí |
| GET | `/api/scanner/zones-report` | Sí |
| POST | `/api/scanner/reference/:productId` form `image` | admin/operador |

> Regla de zona: fotos con igual número base (1+1b, 40+40a+40b) son la misma
> zona; el detalle reemplaza su porción (no duplicar traslape) y el resto se suma.
> `zone-session` NO pisa `Product.stock` sin mapeo SKU confirmado.

## 5. Cómo correr
- Backend: `cd libkn && npm run dev` (levanta Flask automáticamente).
- Conteo auto 1 foto: `POST /api/scanner/scan-auto`. Sesión zona: `POST /api/scanner/zone-session`.
- Batch 53 fotos: `python scanner/batch_all.py` (usa `src/stock/`); reporte en `scanner/reporte_conteo.md`.
- Seed cantidades reales: `node src/utils/seedCantidades.js` (dry-run) y con `--apply`
  reemplaza stock + audita (usa el `.env` del backend con `MONGODB_URI`; empareja por
  MAPEO > exacto > barcode > difuso; zonas AUTO 25/33/34/36 y fusión 27-28 van por
  `REPARTO_ZONAS_AUTO`).
- Entrenamiento clásico (solo si se retoma): `cd scanner && python train.py 50`
  → copiar `weights/train/weights/best.pt` a `weights/best.pt`.
- Vars Python: `SCANNER_CONF_THRESHOLD`, `SCANNER_ALLOW_COCO_FALLBACK`,
  `SCANNER_AUTO_CONF_WORLD` (0.15), `SCANNER_AUTO_CONF_COCO` (0.25).

## 6. Pendientes
- [x] Fotos recibidas: 53 en `libkn/src/stock/` (40 zonas; pares `1/1b`, `40/40a/40b` son planos complementarios y SE SUMAN). Batch 2026-10-05: auto=1108 uds, COCO=639. Ver `libkn/scanner/reporte_conteo.md` + `batch_result.json`.
- [x] CONTEO TOTAL CORREGIDO v2 2026-10-05: `libkn/scanner/conteo_total_final.json` + `.csv` — 40 zonas, 312 líneas, **3.441 uds** (las 53 fotos vistas 1×1; la IA subcontaba ~1/3 en abarrotes/dulces/papel). Criterio: la foto manda. Fusión 27-28 (misma vitrina, 128, no sumar); 38/39 se suman. Seed listo: `src/utils/seedCantidades.js` (corre en backend, sin compartir URI).
- [x] Zonas ALTA por IA + 36 zonas resto por conteo humano visual con familias. Zonas AUTO 25/33/34/36 y fusión 27-28 pendientes de MAPEO a SKU en el seed.
- [x] Seed corriendo con BD real 2026-10-05: respaldo `respaldo_products_734.json` (734 productos, en Escritorio). Lote 1 (15 SKU/127 uds) + lote 2 (5 SKU/46 uds) aplicados y verificados: 20 SKU con stock real, 20 auditorías `StockCount`. Commits `ee9ed9c` + lote2 (seed + `conteo_certero.json`/`conteo_lote2.json` + `SEED_FILE`, MAPEO de 20 pares). Resto (~3.270 uds) pendiente: grupos multimarca, multi-SKU por talla y ~80 marcas sin SKU en BD (Bary, Noel, Trident, Savital, Colgate, Fab, Winny, Bucanero, Yupi, Rexona, pilas, huevo, Bimbo...).
- [ ] Poblar/validar `Product.imageUrl` para todo el catálogo.
- [ ] Tabla mapeo `clase → productId` (SKU) para zonas AUTO; crear en BD las familias sin producto (ver resumen de `aplicar_conteo.js --dry-run`).
- [ ] Tests del matching + auditoría `StockCount` en reportes.
