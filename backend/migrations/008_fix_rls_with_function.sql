-- Crear función para verificar si el usuario tiene un rol permitido para gestionar vehículos
CREATE OR REPLACE FUNCTION public.user_has_vehicle_permissions()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND rol IN ('admin', 'superadmin', 'gerente', 'vendedor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear función para verificar si el usuario es admin o superadmin
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND rol IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar todas las políticas existentes de vehicles
DROP POLICY IF EXISTS "Vehículos legibles por todos" ON vehicles;
DROP POLICY IF EXISTS "Solo admin puede crear vehículos" ON vehicles;
DROP POLICY IF EXISTS "Solo admin puede actualizar vehículos" ON vehicles;
DROP POLICY IF EXISTS "Solo admin puede eliminar vehículos" ON vehicles;
DROP POLICY IF EXISTS "vehicles_admin_only" ON vehicles;
DROP POLICY IF EXISTS "Staff puede crear vehículos" ON vehicles;
DROP POLICY IF EXISTS "Staff puede actualizar vehículos" ON vehicles;
DROP POLICY IF EXISTS "Admin y Superadmin pueden eliminar vehículos" ON vehicles;

-- Crear políticas usando las funciones
CREATE POLICY "public_select_vehicles" 
  ON vehicles FOR SELECT 
  USING (true);

CREATE POLICY "staff_insert_vehicles" 
  ON vehicles FOR INSERT 
  WITH CHECK (user_has_vehicle_permissions());

CREATE POLICY "staff_update_vehicles" 
  ON vehicles FOR UPDATE 
  USING (user_has_vehicle_permissions())
  WITH CHECK (user_has_vehicle_permissions());

CREATE POLICY "admin_delete_vehicles" 
  ON vehicles FOR DELETE 
  USING (user_is_admin());
