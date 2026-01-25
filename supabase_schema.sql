-- ============================================
-- MineConnect SAT - Base de Datos con RLS
-- ============================================

-- Habilitar Row Level Security en todas las tablas
ALTER DATABASE SET "app.current_user_id" TO '0';

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  company_id UUID NOT NULL,
  role TEXT CHECK (role IN ('admin', 'operator', 'viewer')) NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de viajes/trips
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL,
  vehicle_id UUID NOT NULL,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  driver_name TEXT NOT NULL,
  company_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('en_curso', 'finalizado')) NOT NULL DEFAULT 'en_curso',
  max_speed DECIMAL(5,2) DEFAULT 0,
  avg_speed DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de logs de GPS
CREATE TABLE IF NOT EXISTS trip_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  speed DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX idx_trips_company_id ON trips(company_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_start_time ON trips(start_time);
CREATE INDEX idx_trip_logs_trip_id ON trip_logs(trip_id);
CREATE INDEX idx_trip_logs_created_at ON trip_logs(created_at);

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own company profiles" ON profiles
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Políticas para trips
CREATE POLICY "Users can view own company trips" ON trips
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create trips for own company" ON trips
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update trips from own company" ON trips
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Políticas para trip_logs
CREATE POLICY "Users can view logs from own company trips" ON trip_logs
  FOR SELECT USING (trip_id IN (
    SELECT id FROM trips WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create logs for own company trips" ON trip_logs
  FOR INSERT WITH CHECK (trip_id IN (
    SELECT id FROM trips WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

-- Función para obtener información del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS TABLE(id UUID, company_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.company_id, 
    p.role
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar estadísticas del viaje
CREATE OR REPLACE FUNCTION update_trip_stats(trip_uuid UUID)
RETURNS VOID AS $$
DECLARE
  max_speed_val DECIMAL(5,2);
  avg_speed_val DECIMAL(5,2);
BEGIN
  -- Obtener velocidad máxima
  SELECT MAX(speed) INTO max_speed_val
  FROM trip_logs
  WHERE trip_id = trip_uuid;
  
  -- Calcular velocidad promedio
  SELECT AVG(speed) INTO avg_speed_val
  FROM trip_logs
  WHERE trip_id = trip_uuid;
  
  -- Actualizar trip con estadísticas
  UPDATE trips
  SET 
    max_speed = COALESCE(max_speed_val, 0),
    avg_speed = COALESCE(avg_speed_val, 0)
  WHERE id = trip_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar estadísticas cuando se insertan logs
CREATE OR REPLACE FUNCTION auto_update_trip_stats()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_trip_stats(NEW.trip_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_trip_log_insert
  AFTER INSERT ON trip_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_trip_stats();

-- Trigger para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'company_id', gen_random_uuid()::text)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista para viajes activos
CREATE VIEW active_trips AS
SELECT 
  t.*,
  COUNT(tl.id) as log_count,
  MAX(tl.created_at) as last_location_time
FROM trips t
LEFT JOIN trip_logs tl ON t.id = tl.trip_id
WHERE t.status = 'en_curso'
GROUP BY t.id;

-- Vista para estadísticas por conductor
CREATE VIEW driver_stats AS
SELECT 
  p.full_name,
  p.id as driver_id,
  COUNT(t.id) as total_trips,
  AVG(t.max_speed) as avg_max_speed,
  AVG(t.avg_speed) as overall_avg_speed,
  SUM(t.end_time - t.start_time) as total_duration
FROM profiles p
JOIN trips t ON p.id = t.driver_id
WHERE t.status = 'finalizado'
GROUP BY p.id, p.full_name;