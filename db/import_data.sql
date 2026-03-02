-- ============================================================
-- Script de importación de datos desde Supabase
-- Ejecutar DESPUÉS de init.sql y DESPUÉS de copiar los CSVs
-- ============================================================

-- IMPORTANTE: Los usuarios necesitan tratamiento especial.
-- En Supabase el id viene de auth.users. Acá lo mantenemos igual
-- para no romper las FK, pero agregamos un password_hash temporal.

-- Paso 1: Importar usuarios
-- Exporta desde Supabase con: id, nombre, email, rol, activo, fecha_creacion
-- y agrega un password temporal que luego cada usuario cambiará.

-- Si tienes el CSV en /tmp/usuarios.csv:
-- \COPY usuarios(id, nombre, email, rol, activo, fecha_creacion) FROM '/tmp/usuarios.csv' WITH CSV HEADER;

-- Paso 2: Asignar un password temporal (bcrypt hash de "Cambiar123!")
-- Luego cada usuario deberá cambiar su contraseña al primer login
UPDATE usuarios SET password_hash = '$2b$10$placeholder_hash_cambiar_luego' WHERE password_hash = '';

-- Paso 3: Importar clients
-- \COPY clients(id, user_id, name, active, created_at) FROM '/tmp/clients.csv' WITH CSV HEADER;

-- Paso 4: Importar projects
-- \COPY projects(id, user_id, client_id, name, caso_code, active, created_at) FROM '/tmp/projects.csv' WITH CSV HEADER;

-- Paso 5: Importar time_entries
-- \COPY time_entries(id, user_id, project_id, client_id, caso, compania, proyecto, fecha, asunto, servicio, estado, razon, categoria, solicitante, complejidad, hh, horas_utilizadas, fecha_creacion, fecha_solucion, created_at, updated_at) FROM '/tmp/time_entries.csv' WITH CSV HEADER;

-- Paso 6: Importar monthly_hours
-- \COPY monthly_hours(id, user_id, month, total_hours, used_hours, rollover_hours, created_at, updated_at) FROM '/tmp/monthly_hours.csv' WITH CSV HEADER;

-- Paso 7: Verificar conteos
SELECT 'usuarios' AS tabla, count(*) AS registros FROM usuarios
UNION ALL SELECT 'clients', count(*) FROM clients
UNION ALL SELECT 'projects', count(*) FROM projects
UNION ALL SELECT 'time_entries', count(*) FROM time_entries
UNION ALL SELECT 'monthly_hours', count(*) FROM monthly_hours;
