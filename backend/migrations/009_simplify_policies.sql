-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "public_select_vehicles" ON vehicles;
DROP POLICY IF EXISTS "staff_insert_vehicles" ON vehicles;
DROP POLICY IF EXISTS "staff_update_vehicles" ON vehicles;
DROP POLICY IF EXISTS "admin_delete_vehicles" ON vehicles;
DROP POLICY IF EXISTS "allow_select_all" ON vehicles;
DROP POLICY IF EXISTS "allow_insert_authenticated" ON vehicles;
DROP POLICY IF EXISTS "allow_update_authenticated" ON vehicles;
DROP POLICY IF EXISTS "allow_delete_authenticated" ON vehicles;

-- Crear políticas simples sin restricciones (temporal para debugging)
CREATE POLICY "vehicles_select_public"
  ON vehicles FOR SELECT
  USING (true);

CREATE POLICY "vehicles_insert_any"
  ON vehicles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vehicles_update_any"
  ON vehicles FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vehicles_delete_any"
  ON vehicles FOR DELETE
  USING (auth.uid() IS NOT NULL);
