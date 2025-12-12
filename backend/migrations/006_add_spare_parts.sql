-- Crear tipo ENUM para estado de repuestos
CREATE TYPE spare_part_status AS ENUM ('disponible', 'agotado', 'descontinuado');

-- Crear tipo ENUM para categoría de repuestos
CREATE TYPE spare_part_category AS ENUM (
  'motor',
  'transmision',
  'suspension',
  'frenos',
  'electrico',
  'carroceria',
  'interior',
  'aceites_lubricantes',
  'filtros',
  'iluminacion',
  'neumaticos',
  'baterias',
  'otros'
);

-- Tabla de repuestos
CREATE TABLE spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria spare_part_category NOT NULL,
  marca TEXT NOT NULL,
  modelo_compatible TEXT[], -- Array de modelos compatibles
  codigo_parte TEXT, -- Código del fabricante/proveedor
  precio DECIMAL(10, 2) NOT NULL,
  precio_original DECIMAL(10, 2), -- Para mostrar descuentos
  descuento_porcentaje DECIMAL(5, 2) DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5, -- Para alertas de stock bajo
  imagenes TEXT[] DEFAULT '{}',
  estado spare_part_status DEFAULT 'disponible',
  garantia_meses INTEGER DEFAULT 0,
  notas TEXT, -- Notas adicionales (instalación, compatibilidad, etc.)
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Índices para mejorar búsquedas
CREATE INDEX idx_spare_parts_categoria ON spare_parts(categoria);
CREATE INDEX idx_spare_parts_estado ON spare_parts(estado);
CREATE INDEX idx_spare_parts_marca ON spare_parts(marca);
CREATE INDEX idx_spare_parts_stock ON spare_parts(stock);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_spare_parts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spare_parts_updated_at
  BEFORE UPDATE ON spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_spare_parts_updated_at();

-- RLS Policies para spare_parts
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver repuestos disponibles
CREATE POLICY "spare_parts_select_all" ON spare_parts
  FOR SELECT
  USING (true);

-- Solo admin, gerente y vendedor pueden insertar repuestos
CREATE POLICY "spare_parts_insert_staff" ON spare_parts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.rol IN ('admin', 'superadmin', 'gerente', 'vendedor')
    )
  );

-- Solo admin, gerente y vendedor pueden actualizar repuestos
CREATE POLICY "spare_parts_update_staff" ON spare_parts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.rol IN ('admin', 'superadmin', 'gerente', 'vendedor')
    )
  );

-- Solo admin y superadmin pueden eliminar repuestos
CREATE POLICY "spare_parts_delete_admin" ON spare_parts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.rol IN ('admin', 'superadmin')
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE spare_parts IS 'Tabla de repuestos y autopartes';
COMMENT ON COLUMN spare_parts.modelo_compatible IS 'Array de modelos de vehículos compatibles';
COMMENT ON COLUMN spare_parts.stock_minimo IS 'Stock mínimo para generar alertas de reabastecimiento';
