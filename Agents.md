# Listore / La Inmaculada — Contexto del Proyecto (AGENTS.md)

> Raíz frontend: `inmaculadastore/` (Angular 16). Backend: `../libkn/` (Express 5 + Mongoose 9).
> Fuente creada 2026-09-22; **contexto total actualizado 2026-10-05** (sesión conteo total + seed BD real).

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
    │   CashClosing, Debtor, Alert, Settings, StockCount (auditoría de conteos)
    ├── src/utils/: seedAdmin, seedClient, seedOperador, seedInventario(×2, demo),
    │   **seedCantidades.js** (cantidades reales: MAPEO + REPARTO_ZONAS_AUTO + SEED_FILE,
    │   dry-run/`--apply`, audita StockCount), **backupProducts.js** (respaldo JSON)
    └── scanner/: api.py (Flask YOLO + `/scan-auto` + `/zones-report`), auto_count.py
        (YOLO-World retail + COCO, tiers ALTA/MEDIA/BAJA), train.py, scan.py,
        dataset/data.yaml, batch_result.json, reporte_conteo.md,
        conteo_total_final.json/.csv (v2 corregido), conteo_certero.json,
        conteo_lote2.json, batch_annotated/ (evidencia). OJO: `src/stock/` (53 fotos)
        se eliminó del repo y del disco el 2026-10-05 (commit `b9d8203`, pesaba ~200MB);
        el conteo vive en los JSON/CSV. `scanner/weights/`, `*.pt` ignorados en git.
```
- Roles `User`: `admin, cajero, cliente, invitado, operador` (default `cajero`).
- `Product`: name, barcode (unique sparse), category*, supplier, purchasePrice, salePrice,
  stock, minStock, imageUrl, description. Índices texto + isActive.
- Deploy: frontend Vercel (`vercel.json`), backend Railway (`railway.json`).

## 3. Módulo Scanner / Contador de existencias (estado 2026-10-05: conteo total + seed real)
Flujo YOLO clásico: subir foto → inferencia (`scanner/api.py`) → confirmación →
actualización con auditoría. **Motor automático sin `best.pt`**
(`scanner/auto_count.py`: YOLO-World retail + corroboración COCO, tiers
ALTA/MEDIA/BAJA) + sesiones multifoto por zona + tab frontend `Zonas` +
**conteo total corregido v2: 3.441 uds** (`scanner/conteo_total_final.json/.csv`,
312 líneas) + **seed de cantidades contra BD real** (`src/utils/seedCantidades.js`).
Criterio vigente: la foto manda, el sistema anterior era supuesto.

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

### 3.3 Decisión de producto (2026-09-22, SUPERADA el 2026-10-05)
La idea inicial era catálogo por similitud (1 foto/producto + CLIP/embedding).
Se reemplazó por: YOLO-World open-vocabulary sin `best.pt` + conteo humano visual
donde la IA no segmenta + seed de cantidades a BD. Las 53 fotos ya se tomaron,
contaron (3.441 uds) y eliminaron del repo; no pedir más fotos por ahora.

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
- Backend: `cd libkn && npm install && npm run dev` (levanta Flask automáticamente).
- Conteo auto 1 foto: `POST /api/scanner/scan-auto`. Sesión zona: `POST /api/scanner/zone-session`.
- Batch 53 fotos: `python scanner/batch_all.py` — REQUIERE `src/stock/` (eliminado del
  repo 2026-10-05; solo re-ejecutable si se restauran las fotos). Reporte en
  `scanner/reporte_conteo.md`.
- Respaldo: `node src/utils/backupProducts.js` → `scanner/respaldo_products_<fecha>.json`
  (copia de 734 productos también en Escritorio del PC tienda).
- Seed cantidades reales: `node src/utils/seedCantidades.js` (dry-run) y con `--apply`
  reemplaza stock + audita. `SEED_FILE` para lotes parciales (`conteo_certero.json`,
  `conteo_lote2.json`). Empareja MAPEO > exacto > barcode > difuso; zonas AUTO
  25/33/34/36 y fusión 27-28 van por `REPARTO_ZONAS_AUTO`. Requiere `MONGODB_URI`
  (solo en backend con `.env`; NUNCA commitear ni pegar en chats sin rotar después).
- Entrenamiento clásico (solo si se retoma): `cd scanner && python train.py 50`
  → copiar `weights/train/weights/best.pt` a `weights/best.pt`.
- Vars Python: `SCANNER_CONF_THRESHOLD`, `SCANNER_ALLOW_COCO_FALLBACK`,
  `SCANNER_AUTO_CONF_WORLD` (0.15), `SCANNER_AUTO_CONF_COCO` (0.25).

## 6. Estado y pendientes (2026-10-05)
- [x] 53 fotos (40 zonas, 4000×2250) → batch IA (auto 1.108 + COCO 639) → corrección
  humana foto×foto → **v2: 3.441 uds, 312 líneas** (`conteo_total_final.json/.csv`).
  La IA subcontaba ~2/3 en abarrotes/dulces/papel (zona 10: IA 62 → real ~210).
- [x] Regla de zona: el detalle reemplaza su porción (no duplicar); resto se suma.
  Fusión 27-28 (misma vitrina, lados opuestos): 114+67 → **128**. 38/39 se suman.
  Traslapes por verificar en sitio: 11/12b, 27/28, 38/39; pilones 26/27/28 = estimación.
- [x] BD real `listore`: 734 productos (levantamiento del dueño, stock supuesto 24),
  18 categorías, 51 proveedores, 10 ventas de PRUEBA (ignorar).
  Seed aplicado: lote 1 (15 SKU/127 uds) + lote 2 (5 SKU/46 uds) = **20 SKU con stock
  real, 20 auditorías `StockCount`**. Commits `ee9ed9c` + lote2 (locales, sin push).
- [ ] Lote 3+: ~3.270 uds pendientes = grupos multimarca (ej "Cajetillas"=65),
  multi-talla (Azúcar 8 SKUs, Fruco 12 sobres, Isabel aceite/agua) y ~80 marcas sin
  SKU en BD (Bary, Noel, Trident, Savital, Colgate, Fab, Winny, Bucanero, Yupi,
  Rexona, Gillette, Dove, Pantene, Nutribela, Fabuloso, huevo, Bimbo, pilas...).
  Falsos positivos ya rechazados: Todito≠DeTodito, Gala≠tajada, Panela≠Panelada,
  Aloha≠vaso, Choco Listo≠paleta, Todito/Chao/Jet multimarca→1 SKU.
- [ ] Crear SKUs faltantes con precios reales y desgloses por tanda para lote 3+.
- [ ] Poblar/validar `Product.imageUrl` para todo el catálogo.
- [ ] Tests del matching + auditoría `StockCount` en reportes.
- [ ] Push commits locales (`ee9ed9c`, lote2) a `origin/main` cuando se indique.

## 7. Lecciones de la sesión (no repetir errores)
- YOLO-World es fiable solo en botellas/neveras (zona 33: IA 49 ≈ real); en apilados
  densos, vidrio con reflejo (duplica ~10%) y minis (cajetillas, sobres) subcuenta
  brutal: siempre validar con conteo humano por filas×columnas.
- `zone-session` y el seed NUNCA pisan `Product.stock` sin mapeo SKU confirmado.
- Ventas de prueba en BD: no bloquearon el seed, pero verificar siempre `sales`
  antes de reemplazos masivos (respaldo primero).
- Secretos: `MONGODB_URI` solo vía `.env`/env del backend o Render Shell; si se
  expone en un chat, rotar password en Atlas (Database Access) de inmediato.
- `git` en este PC: `listore/` es repo sin commits (no tocar); el backend real es
  `listore/libkn` (remoto `github.com/CrisAguirre/libkn`, rama `main`).
