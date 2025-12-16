-- Dar permisos completos a los roles de Supabase
GRANT ALL ON TABLE vehicles TO anon;
GRANT ALL ON TABLE vehicles TO authenticated;
GRANT ALL ON TABLE vehicles TO service_role;

-- Verificar permisos
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'vehicles';
