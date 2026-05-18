-- Migración: agregar columna horas_mensuales a usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS horas_mensuales NUMERIC NOT NULL DEFAULT 120;
