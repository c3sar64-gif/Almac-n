# Diseño: Sistema de Almacenes (v1)

**Fecha:** 2026-07-13
**Estado:** Aprobado por el usuario

## Contexto y objetivo

Sistema de gestión de inventario multi-almacén para un negocio real, accesible por
internet (nube). Backend y frontend completamente separados. El usuario tiene
experiencia en C#/Java.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | C# — ASP.NET Core Web API (REST) + Entity Framework Core |
| Frontend | React + TypeScript (Vite) |
| Base de datos | PostgreSQL (migraciones con EF Core) |
| Autenticación | JWT con roles (Admin / Operador) |
| Pruebas backend | xUnit (unitarias + integración con BD de prueba) |
| Pruebas frontend | Vitest + React Testing Library |

## Arquitectura

```
Almacen/
├── backend/          → API REST en ASP.NET Core (C#)
│   ├── src/
│   │   ├── Almacen.Api/            → Controladores, configuración, auth
│   │   ├── Almacen.Core/           → Entidades y lógica de negocio
│   │   └── Almacen.Infrastructure/ → EF Core, acceso a PostgreSQL
│   └── tests/
└── frontend/         → React + TypeScript (Vite)
    └── src/
        ├── api/       → cliente HTTP hacia el backend
        ├── pages/     → pantallas (productos, almacenes, movimientos…)
        └── components/
```

- El frontend consume la API vía REST/JSON. Ambos se despliegan por separado
  (ej. API en un servidor o contenedor, frontend como archivos estáticos/CDN).
- Endpoints protegidos con JWT; operaciones administrativas (crear almacenes,
  usuarios) requieren rol Admin.

## Módulos funcionales (v1)

1. **Catálogo de productos** — SKU, nombre, descripción, categoría, unidad de medida, activo.
2. **Almacenes** — alta y edición de almacenes/sucursales.
3. **Existencias** — stock por producto por almacén, con stock mínimo y alertas.
4. **Movimientos** — entradas, salidas y transferencias entre almacenes, con
   historial completo (quién, cuándo, nota).
5. **Usuarios y roles** — login, roles Admin y Operador.
6. **Reportes básicos** — existencias actuales y movimientos por rango de fechas.

**Fuera de alcance en v1** (posibles fases futuras): compras/proveedores,
ventas/facturación, códigos de barras, app móvil.

## Modelo de datos

- **Producto** — sku (único), nombre, descripción, categoría, unidad de medida, activo.
- **Almacen** — nombre, ubicación, activo.
- **Existencia** — producto + almacén + cantidad + stock mínimo. Única por
  combinación producto/almacén.
- **Movimiento** — tipo (Entrada / Salida / Transferencia), producto, cantidad,
  almacén origen y/o destino, fecha, usuario, nota. Inmutable: nunca se edita
  ni se borra; es el historial auditable.
- **Usuario** — email, hash de contraseña, rol (Admin / Operador).

**Regla central:** las existencias solo se modifican a través de movimientos,
dentro de una transacción de base de datos. Una transferencia descuenta del
origen y suma al destino de forma atómica; si algo falla, no se aplica nada.

## Manejo de errores y validaciones

- El backend rechaza salidas/transferencias que excedan el stock disponible,
  con un mensaje de error claro.
- SKUs duplicados rechazados.
- Errores de la API en formato JSON consistente; el frontend los traduce a
  mensajes entendibles para el usuario.
- Sin token JWT válido no hay acceso a ningún endpoint de datos.

## Pruebas

- **Backend:** unitarias sobre la lógica de negocio (prioridad: movimientos y
  transferencias) con xUnit; integración de la API contra una base de datos de
  prueba.
- **Frontend:** pruebas de componentes clave (formularios de movimientos,
  tablas de existencias) con Vitest + React Testing Library.
