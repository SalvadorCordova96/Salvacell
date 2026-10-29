INSERT INTO brands (name, active, sort) VALUES
  ('Samsung', 1, 1), ('Apple', 1, 2), ('Motorola', 1, 3),
  ('Xiaomi', 1, 4), ('Oppo', 1, 5), ('Huawei', 1, 6),
  ('Honor', 1, 7), ('Realme', 1, 8), ('ZTE', 1, 9)
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
INSERT INTO services (name, base_price_cents, currency, warranty_days, active, sort) VALUES
  ('Cambio de pantalla', 0, 'MXN', 0, 1, 1),
  ('Cambio de batería', 0, 'MXN', 0, 1, 2),
  ('Centro de carga', 0, 'MXN', 0, 1, 3),
  ('Diagnóstico / revisión', 0, 'MXN', 0, 1, 4),
  ('Reparación de placa', 0, 'MXN', 0, 1, 5),
  ('Software', 0, 'MXN', 0, 1, 6),
  ('Otro', 0, 'MXN', 0, 1, 7)
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
INSERT INTO payment_methods (key, label, active, sort) VALUES
  ('efectivo', 'Efectivo', 1, 1),
  ('transferencia', 'Transferencia', 1, 2),
  ('tarjeta', 'Tarjeta', 1, 3),
  ('otro', 'Otro', 1, 4)
ON CONFLICT (key) DO NOTHING;
