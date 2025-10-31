#!/bin/bash

# ============================================================================
# Script de reconstrucción de base de datos - Aurora Nova
# ============================================================================
# Este script automatiza el flujo de desarrollo en fase alpha:
# 1. Rollback (limpiar todo)
# 2. Schema (recrear estructura)
# 3. Seeds (poblar datos iniciales)
# ============================================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración de conexión
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-aurora_nova_db}"
DB_USER="${DB_USER:-aurora_user}"
DB_PASSWORD="${PGPASSWORD:-changeme_in_production}"

# Directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔄 Aurora Nova - Reconstrucción de BD${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Función para ejecutar SQL
execute_sql() {
    local file=$1
    local description=$2

    echo -e "${YELLOW}▶ ${description}...${NC}"

    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${file}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${description} completado${NC}"
        return 0
    else
        echo -e "${RED}❌ Error en ${description}${NC}"
        return 1
    fi
}

# Verificar que PostgreSQL está corriendo
echo -e "${YELLOW}🔍 Verificando conexión a PostgreSQL...${NC}"
if ! PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ No se puede conectar a PostgreSQL${NC}"
    echo -e "${YELLOW}   Asegúrate de que Docker esté corriendo: docker compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión exitosa${NC}"
echo ""

# Advertencia
echo -e "${RED}⚠️  ADVERTENCIA: Esta operación eliminará TODOS los datos de la base de datos${NC}"
echo -e "${YELLOW}   Presiona Ctrl+C para cancelar, o Enter para continuar...${NC}"
read -r

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Paso 1/3: Rollback${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${SCRIPT_DIR}/rollback.sql"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Paso 2/3: Schema${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

execute_sql "${SCRIPT_DIR}/schema.sql" "Creación de esquema"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Paso 3/3: Seeds${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

execute_sql "${SCRIPT_DIR}/seeds.sql" "Población de datos iniciales"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Reconstrucción completada exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Base de datos lista con:${NC}"
echo -e "  • 9 tablas creadas"
echo -e "  • 3 roles configurados"
echo -e "  • 16 permisos definidos"
echo -e "  • 25 asignaciones de permisos"
echo ""
echo -e "${YELLOW}Siguiente paso: Regenerar cliente Prisma${NC}"
echo -e "${YELLOW}  cd app && npm run db:generate${NC}"
echo ""
