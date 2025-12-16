-- Actualizar políticas RLS de vehicles para incluir todos los roles que deben gestionar vehículos
-- Incluye: superadmin, admin, gerente, vendedor

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Solo admin puede crear vehículos" ON vehicles;
DROP POLICY IF EXISTS "Solo admin puede actualizar vehículos" ON vehicles;
DROP POLICY IF EXISTS "Solo admin puede eliminar vehículos" ON vehicles;
DROP POLICY IF EXISTS "vehicles_admin_only" ON vehicles;
DROP POLICY IF EXISTS "Staff puede crear vehículos" ON vehicles;
DROP POLICY IF EXISTS "Staff puede actualizar vehículos" ON vehicles;
DROP POLICY IF EXISTS "Admin y Superadmin pueden eliminar vehículos" ON vehicles;

-- Crear nuevas políticas con múltiples roles
CREATE POLICY "Staff puede crear vehículos" 
  ON vehicles FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE rol IN ('admin', 'superadmin', 'gerente', 'vendedor')
    )
  );

CREATE POLICY "Staff puede actualizar vehículos" 
  ON vehicles FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE rol IN ('admin', 'superadmin', 'gerente', 'vendedor')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE rol IN ('admin', 'superadmin', 'gerente', 'vendedor')
    )
  );

CREATE POLICY "Admin y Superadmin pueden eliminar vehículos" 
  ON vehicles FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE rol IN ('admin', 'superadmin')
    )
  );
