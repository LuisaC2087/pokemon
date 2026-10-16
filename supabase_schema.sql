-- ==============================================================
-- Migración de Base de Datos en Supabase: Tabla "profesores"
-- Actualizada para coincidir exactamente con los campos de SQLite:
-- id, nombre, departamento, profesion, email, telefono, imagen_url
-- ==============================================================

-- 1. Eliminar la tabla anterior si existe (acepta pérdida de datos anteriores)
DROP TABLE IF EXISTS profesores CASCADE;

-- 2. Crear la tabla profesores con los mismos campos
CREATE TABLE profesores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  departamento TEXT NOT NULL DEFAULT '',
  profesion TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  imagen_url TEXT NOT NULL DEFAULT '',
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;

-- 4. Crear política para permitir lectura, inserción, actualización y borrado público/anónimo
CREATE POLICY "Acceso total a profesores" ON profesores
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Opcional: Insertar un docente inicial de prueba
INSERT INTO profesores (id, nombre, departamento, profesion, email, telefono, imagen_url)
VALUES (
  'd3b07384-d113-4f90-8a12-87063d89d9f1',
  'Dr. Roberto Silva',
  'Ingeniería de Sistemas',
  'Docente e Investigador',
  'roberto.silva@universidad.edu',
  '+57 310 9876543',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
);
