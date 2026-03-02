-- ============================================================
-- Control Horas - Schema para PostgreSQL standalone
-- Generado a partir de las migraciones de Supabase
-- ============================================================

-- Extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TABLA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  rol TEXT NOT NULL DEFAULT 'usuario',       -- valores: admin, dev, usuario
  activo BOOLEAN NOT NULL DEFAULT true,
  is_released BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMPTZ,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN usuarios.rol IS 'Valores válidos: admin, dev, usuario';

-- ============================================================
-- 2. TABLA: clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. TABLA: projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  caso_code TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. TABLA: time_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  caso TEXT NOT NULL DEFAULT '',
  compania TEXT NOT NULL DEFAULT '',
  proyecto TEXT NOT NULL DEFAULT '',
  fecha DATE,
  asunto TEXT NOT NULL DEFAULT '',
  servicio TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'abierto',
  razon TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  solicitante TEXT NOT NULL DEFAULT '',
  complejidad TEXT NOT NULL DEFAULT 'media',
  hh NUMERIC NOT NULL DEFAULT 0,
  horas_utilizadas NUMERIC NOT NULL DEFAULT 0,
  fecha_creacion DATE,
  fecha_solucion DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. TABLA: monthly_hours
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  used_hours NUMERIC NOT NULL DEFAULT 0,
  rollover_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- ============================================================
-- 6. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_caso_code ON projects(caso_code);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_caso ON time_entries(caso);
CREATE INDEX IF NOT EXISTS idx_time_entries_fecha ON time_entries(fecha);
CREATE INDEX IF NOT EXISTS idx_monthly_hours_user_month ON monthly_hours(user_id, month);

-- ============================================================
-- 7. FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_monthly_hours_updated_at
  BEFORE UPDATE ON monthly_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. USUARIO ADMINISTRADOR POR DEFECTO
-- ============================================================
-- Email: admin@admin.com
-- Password: admin
INSERT INTO usuarios (nombre, email, password_hash, rol)
VALUES (
  'Administrador',
  'admin@admin.com',
  crypt('admin', gen_salt('bf', 10)),
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- FIN
-- ============================================================
