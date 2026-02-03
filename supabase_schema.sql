-- Create table for vehicles
create table vehicles (
  id text primary key,
  plate text not null,
  status text not null, -- 'online', 'warning', 'offline', 'maintenance'
  lat double precision not null,
  lng double precision not null,
  speed integer default 0,
  heading integer default 0,
  last_update timestamp with time zone default timezone('utc'::text, now()) not null,
  battery_level integer default 100,
  fatigue_level integer default 0
);

-- Enable Row Level Security (RLS)
alter table vehicles enable row level security;

-- Create policy to allow read access for everyone (anon)
create policy "Allow public read access"
  on vehicles
  for select
  to anon
  using (true);

-- Create policy to allow updates for everyone (demo purposes)
create policy "Allow public update access"
  on vehicles
  for update
  to anon
  using (true)
  with check (true);

-- Enable Realtime for the vehicles table
alter publication supabase_realtime add table vehicles;

-- Insert some dummy data to start with (optional)
insert into vehicles (id, plate, status, lat, lng, speed, heading, battery_level, fatigue_level)
values
  ('v1', 'Toyota Hilux - AB 123 CD', 'online', -24.55, -67.05, 45, 90, 100, 0),
  ('v2', 'Camión Volador - MN 456 OP', 'warning', -24.48, -67.12, 12, 180, 85, 20);

-- Create table for security events (Audit Log)
create table security_events (
  id uuid default gen_random_uuid() primary key,
  user_id text not null, -- ID of the user triggering the event (or system)
  vehicle_id text, -- Optional, linked vehicle
  type text not null, -- 'SOS', 'GEOFENCE_VIOLATION', 'FATIGUE_ALERT', 'SOS_RESOLVED'
  severity text not null, -- 'critical', 'high', 'medium', 'low', 'info'
  location jsonb, -- { lat: number, lng: number }
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  legal_hash text not null, -- SHA-256 signature
  details jsonb -- Extra info usually for context
);

-- Enable Row Level Security (RLS) for security_events
alter table security_events enable row level security;

-- Policy: Allow inserts for authenticated users (drivers, operators)
create policy "Allow authenticated insert"
  on security_events
  for insert
  to authenticated
  with check (true);

-- Policy: Allow read access for authenticated users (admins, operators)
create policy "Allow authenticated read"
  on security_events
  for select
  to authenticated
  using (true);

-- Enable Realtime for security_events
alter publication supabase_realtime add table security_events;
