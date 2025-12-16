-- TEMPORAL: Deshabilitar RLS para debugging
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'vehicles';
