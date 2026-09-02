CREATE TABLE IF NOT EXISTS user_preferences (
  user_sub text PRIMARY KEY NOT NULL,
  weather_city text,
  weather_latitude numeric(10, 6),
  weather_longitude numeric(10, 6),
  weather_geocoded_at timestamptz
);
