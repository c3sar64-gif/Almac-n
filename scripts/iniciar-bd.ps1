# Inicia el servidor PostgreSQL portable instalado en LocalAppData.
# Uso: .\scripts\iniciar-bd.ps1   (agregar -detener para apagarlo)
param([switch]$detener)

$pg = "$env:LOCALAPPDATA\pgsql"
if (-not (Test-Path "$pg\bin\pg_ctl.exe")) {
    Write-Error "No se encontró PostgreSQL en $pg. Ver docs/superpowers/plans/2026-07-13-almacen-backend.md (Task 3)."
    exit 1
}
if ($detener) {
    & "$pg\bin\pg_ctl.exe" -D "$pg\data" stop
} else {
    & "$pg\bin\pg_ctl.exe" -D "$pg\data" -l "$pg\postgres.log" start
}
