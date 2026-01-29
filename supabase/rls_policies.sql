-- Enable RLS on necessary tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_points ENABLE ROW LEVEL SECURITY;

/*
RBAC policies:
Admin: see all; Coords: read/write only their company; Conductor: read/write only their company
*/

-- Profiles visibility by role
CREATE POLICY profiles_admin_all ON profiles
FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY profiles_coordinator ON profiles
FOR ALL USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'coordinator' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'coordinator' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY profiles_conductor ON profiles
FOR ALL USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'conductor' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'conductor' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Trips visibility and access
CREATE POLICY trips_admin_all ON trips
FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY trips_coordinator ON trips
FOR ALL USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'coordinator' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'coordinator' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY trips_conductor ON trips
FOR ALL USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'conductor' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'conductor' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- GPS points policies
CREATE POLICY gps_points_admin_all ON gps_points
FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY gps_points_coordinator ON gps_points
FOR ALL USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'coordinator' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'coordinator' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY gps_points_conductor ON gps_points
FOR ALL USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'conductor' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'conductor' AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);
