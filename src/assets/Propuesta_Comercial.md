# Propuesta Comercial: Sistema de Gestión de Inventario y Punto de Venta (POS)

## 1. Resumen de la Aplicación
El sistema es una solución integral de gestión comercial, inventario y punto de venta (POS) diseñada para optimizar los procesos de administración de tiendas y negocios retail. Proporciona herramientas tanto para la venta directa al cliente como para la gestión administrativa de trastienda, permitiendo un control total sobre productos, finanzas y usuarios.

## 2. Funcionalidades Principales

El sistema está compuesto por los siguientes módulos y características:

### 🏪 Punto de Venta (POS) y Ventas
- **Caja Registradora:** Interfaz optimizada y rápida para la gestión de ventas directas.
- **Control de Ventas:** Registro detallado de las transacciones, generación de recibos y control de flujo de caja.

### 📦 Gestión de Inventario y Productos
- **Catálogo de Productos:** Creación, edición y eliminación de productos con información detallada.
- **Categorización:** Clasificación de productos por categorías para una búsqueda y gestión más eficiente.
- **Control de Stock:** Monitoreo en tiempo real de las cantidades disponibles y alertas de bajo inventario.

### 👥 Clientes, Deudores y Proveedores
- **Gestión de Deudores (Cuentas por Cobrar):** Control de créditos otorgados a clientes, historial de pagos y saldos pendientes.
- **Administración de Proveedores:** Base de datos de proveedores, información de contacto y vinculación con las compras de abastecimiento.

### 🛒 Compras y Abastecimiento
- **Registro de Compras:** Ingreso de mercancía al sistema y actualización automática del inventario tras cada compra a proveedores.

### 💰 Finanzas y Control de Caja
- **Apertura y Cierre de Caja:** Control estricto de los turnos de los cajeros, cuadre de caja y declaración de montos.
- **Control de Gastos:** Registro de gastos operativos del negocio (servicios, nómina, etc.) para tener la utilidad neta real.
- **Módulo Financiero:** Resúmenes y métricas del estado financiero general de la tienda.

### 📊 Reportes y Dashboard
- **Dashboard Interactivo:** Panel de control principal con gráficos y KPIs en tiempo real (ventas del día, productos más vendidos, etc.).
- **Reportes Detallados:** Generación de informes históricos sobre ventas, compras, deudores y métricas de rendimiento.

### ⚙️ Administración y Seguridad
- **Autenticación y Roles:** Sistema de login seguro con manejo de permisos según el rol (Ej. Administrador, Cajero).
- **Configuraciones del Sistema:** Personalización de los parámetros del negocio.
- **Alertas del Sistema:** Notificaciones automáticas para eventos importantes (ej. stock bajo).
- **Storefront / Vitrina:** Módulo para la visualización pública de productos u ofertas.

---

## 3. Arquitectura y Lenguajes de Programación

La aplicación está construida bajo una arquitectura **Cliente-Servidor (Frontend y Backend separados)**, garantizando escalabilidad, seguridad y alto rendimiento.

### 🎨 Frontend (Interfaz de Usuario)
- **Framework:** **Angular 16**
- **Lenguaje:** **TypeScript**
- **Características:**
  - Desarrollo basado en componentes (Modularidad).
  - Uso de **RxJS** para la programación reactiva y manejo de estados asíncronos.
  - Integración de **Chart.js** (`ng2-charts`) para la visualización gráfica de datos en el Dashboard.
  - Uso de alertas dinámicas e interactivas con **SweetAlert2** y **ngx-toastr**.
- **Enfoque:** Interfaz responsiva (SPA - Single Page Application), proporcionando una experiencia de usuario rápida y sin recargas de página.

### ⚙️ Backend (Lógica de Negocio y API)
- **Framework:** **Node.js** con **Express.js (v5)**
- **Lenguaje:** **JavaScript (CommonJS)**
- **Base de Datos:** **MongoDB** (NoSQL), utilizando el ORM **Mongoose** para el modelado de datos.
- **Características y Librerías de Seguridad:**
  - **Autenticación:** JSON Web Tokens (`jsonwebtoken`) y encriptación de contraseñas con `bcryptjs`.
  - **Seguridad:** Protección contra vulnerabilidades web con `helmet` y limitación de peticiones (Rate Limiting) con `express-rate-limit` para evitar ataques DDoS.
  - **Validación de Datos:** Uso de `Joi` para asegurar la integridad de la información que ingresa al servidor.
  - **Manejo de Archivos:** Subida de imágenes/archivos mediante `multer`.

---

## 4. Estructura de Despliegue (Deployment)

La plataforma utiliza servicios en la nube modernos y altamente disponibles para su funcionamiento continuo:

1. **Despliegue del Frontend:**
   - Alojado en **Vercel** (`vercel.json`), una de las plataformas líderes en el mundo para el alojamiento de aplicaciones Frontend. Esto garantiza tiempos de carga ultrarrápidos gracias a su red global de distribución de contenido (CDN).

2. **Despliegue del Backend:**
   - Hospedado en **Railway** (`railway.json`), un servicio de infraestructura en la nube especializado en el despliegue automático, seguro y escalable de contenedores y servicios Node.js.

3. **Despliegue de la Base de Datos:**
   - La persistencia de datos (MongoDB) suele estar conectada a un servicio en la nube especializado como MongoDB Atlas, garantizando copias de seguridad automáticas y alta disponibilidad.

**Flujo de Comunicación:**
El Frontend (Angular en Vercel) realiza peticiones HTTPS (API REST) hacia el Backend (Node.js en Railway), el cual procesa las reglas de negocio, verifica la seguridad (Tokens JWT), se comunica con la base de datos (MongoDB) y retorna la información al cliente en formato JSON.
