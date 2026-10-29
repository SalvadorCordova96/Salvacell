-- Synthetic one-week Salvacel scenario. Run only against compose.mock.yaml's
-- isolated salvacel_demo database. This appends once; it never touches live data.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE creation_key = 'demo-week-order-1') THEN
    RAISE EXCEPTION 'El escenario semanal demo ya existe; no se duplicó.';
  END IF;
END;
$$;

DO $$
DECLARE
  first_names text[] := ARRAY['Alex','María','Cris','Paty','Rafa','Sam','Noé','Vale','Luz','Dani','Ari','Emi','Fer','Majo','Beto','Nico','Sofi','Gael'];
  last_names text[] := ARRAY['Luna','Ríos','Vega','Solís','Paz','Cruz','Reyes','León','Mora','Nava','Gil','Roca'];
  brands text[] := ARRAY['Samsung','Apple','Motorola','Xiaomi','Huawei','OPPO','Honor','Samsung','Apple','Motorola','Xiaomi','Google'];
  models text[] := ARRAY['Galaxy A54','iPhone 13','Moto G84','Redmi Note 13','P30 Lite','A78','X8b','Galaxy S22','iPhone 12','Moto G54','Redmi Note 12','Pixel 7a'];
  repair_types text[] := ARRAY['Cambio de pantalla','Cambio de batería','Centro de carga','Diagnóstico','Cambio de cámara','Cambio de tapa','Micrófono','Altavoz'];
  problems text[] := ARRAY['Pantalla estrellada; táctil intermitente','Batería se descarga rápido','No reconoce el cable de carga','Se reinicia después de una caída','Cámara con manchas en las fotos','Tapa trasera despegada','Micrófono bajo durante llamadas','Audio distorsionado'];
  parts text[] := ARRAY['Pantalla','Batería','Centro de carga','Flex de encendido','Cámara trasera','Tapa trasera','Micrófono','Altavoz'];
  qualities text[] := ARRAY['Original','OLED premium','Genérica','Service Pack','Compatible alta calidad','Por confirmar'];
  methods text[] := ARRAY['efectivo','transferencia','tarjeta','otro'];
  suppliers text[] := ARRAY['Refacciones Demo Centro','Pantallas Demo Norte','Mayoreo Demo MX','Piezas Simuladas del Valle','Distribuidor Ficticio Uno','Accesorios Demo Express','Importadora de Prueba','Proveedor Sintético Sur'];
  product_names text[] := ARRAY['Funda transparente','Funda reforzada','Cargador USB-C 20W','Cable USB-C','Cable Lightning','Mica de vidrio','Mica privacidad','Audífonos alámbricos','Adaptador USB-C','Soporte para auto','Cargador para auto','Pop socket','Bocina portátil','Cargador inalámbrico','Protector de cámara','Funda tipo cartera','Cable USB-C trenzado','Adaptador Lightning','Audífonos Bluetooth','Batería externa','Lápiz táctil','Tarjeta microSD 64GB','Tarjeta microSD 128GB','Soporte de escritorio','Cubo carga rápida','Cable micro USB','Mica hidrogel','Funda antigolpes','Tripié compacto','Kit limpieza'];
  categories text[] := ARRAY['Fundas','Fundas','Cargadores','Cables','Cables','Micas','Micas','Audio','Adaptadores','Accesorios','Cargadores','Accesorios','Audio','Cargadores','Micas','Fundas','Cables','Adaptadores','Audio','Energía','Accesorios','Almacenamiento','Almacenamiento','Accesorios','Cargadores','Cables','Micas','Fundas','Accesorios','Accesorios'];
  customer_ids integer[] := ARRAY[]::integer[];
  supplier_ids integer[] := ARRAY[]::integer[];
  product_ids integer[] := ARRAY[]::integer[];
  order_ids integer[] := ARRAY[]::integer[];
  repair_ids integer[] := ARRAY[]::integer[];
  part_ids integer[] := ARRAY[]::integer[];
  first_repair_id integer;
  customer_id integer;
  supplier_id integer;
  product_id integer;
  reception_id integer;
  order_id integer;
  repair_id integer;
  part_id integer;
  request_id integer;
  association_id integer;
  response_id integer;
  quote_id integer;
  sale_id integer;
  purchase_id integer;
  receipt_id integer;
  item_id integer;
  status_value text;
  request_status text;
  part_status text;
  method_value text;
  currency_value text;
  created_value text;
  delivered_value text;
  total_value integer;
  paid_value integer;
  service_value integer;
  part_value integer;
  day_number integer;
  i integer;
  j integer;
BEGIN
  UPDATE settings
  SET workshop_name = 'Salvacel | SEMANA DE DEMOSTRACIÓN',
      phone = '', whatsapp = '', address = '', revision = revision + 1
  WHERE id = 1;

  -- Customer and supplier records deliberately contain no real contact details.
  FOR i IN 1..50 LOOP
    INSERT INTO customers(first_name,last_name,phone,notes,created_at,updated_at)
    VALUES (first_names[((i-1) % array_length(first_names,1))+1],
      last_names[((i-1) % array_length(last_names,1))+1] || ' Semana DEMO ' || lpad(i::text,3,'0'),
      '', 'Registro ficticio para recorrer pantallas y filtros.', now()::text, now()::text)
    RETURNING id INTO customer_id;
    customer_ids := array_append(customer_ids,customer_id);
  END LOOP;

  FOR i IN 1..array_length(suppliers,1) LOOP
    INSERT INTO suppliers(name,phone,notes,active,created_at,updated_at)
    VALUES (suppliers[i],'','Proveedor ficticio; no enviar mensajes.',1,now()::text,now()::text)
    RETURNING id INTO supplier_id;
    supplier_ids := array_append(supplier_ids,supplier_id);
  END LOOP;

  FOR i IN 1..array_length(product_names,1) LOOP
    INSERT INTO products(sku,name,category,price_cents,cost_cents,currency,stock,active,created_at,updated_at)
    VALUES ('DEMO-WK-' || lpad(i::text,3,'0'),product_names[i],categories[i],
      9900 + ((i * 1379) % 64000), 4500 + ((i * 733) % 38000), 'MXN',
      CASE WHEN i IN (3,6,8,15,25) THEN (i % 3) ELSE 2 + ((i * 7) % 28) END,
      CASE WHEN i IN (29,30) THEN 0 ELSE 1 END, now()::text, now()::text)
    RETURNING id INTO product_id;
    product_ids := array_append(product_ids,product_id);
  END LOOP;

  -- A mix of current, expired, converted-later, and foreign-currency budgets.
  FOR i IN 1..18 LOOP
    INSERT INTO quotes(creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,exchange_rate,valid_until)
    VALUES ('demo-week-quote-' || i,
      to_char((current_date - (6 - ((i-1)%7)))::timestamp + time '10:15','YYYY-MM-DD"T"HH24:MI:SS'),
      now()::text, first_names[((i-1)%array_length(first_names,1))+1],
      'Presupuesto DEMO ' || lpad(i::text,3,'0'), '', brands[((i-1)%array_length(brands,1))+1],
      models[((i-1)%array_length(models,1))+1], problems[((i-1)%array_length(problems,1))+1],
      repair_types[((i-1)%array_length(repair_types,1))+1],
      CASE WHEN i%4=0 THEN 'Incluye dos opciones de calidad; datos sintéticos.' ELSE 'Cotización de demostración.' END,
      CASE WHEN i%6=0 THEN 'USD' ELSE 'MXN' END,
      18000 + i*2700, 12000 + i*3900, CASE WHEN i%4=0 THEN 5000 ELSE 0 END, 500, CASE WHEN i%4=0 THEN 1 ELSE 0 END,
      CASE WHEN i%6=0 THEN 17.25 ELSE NULL END,
      to_char((current_date + CASE WHEN i%3=0 THEN -2 ELSE 7 END)::date,'YYYY-MM-DD'))
    RETURNING id INTO quote_id;
  END LOOP;

  -- 84 work orders: 12 arrivals per day across a rolling seven-day period.
  FOR i IN 1..84 LOOP
    day_number := (i-1) / 12;
    created_value := to_char((current_date - (6-day_number))::timestamp + time '09:00' + ((i%10)*interval '47 minutes'),'YYYY-MM-DD"T"HH24:MI:SS');
    status_value := CASE (i-1)%12
      WHEN 0 THEN 'nueva'
      WHEN 1 THEN 'proceso'
      WHEN 2 THEN 'proceso'
      WHEN 3 THEN 'proceso'
      WHEN 4 THEN 'esperando_refaccion'
      WHEN 5 THEN 'esperando_refaccion'
      WHEN 6 THEN 'terminada'
      WHEN 7 THEN 'terminada'
      WHEN 8 THEN 'entregada'
      WHEN 9 THEN 'entregada'
      ELSE 'cancelada'
    END;
    customer_id := customer_ids[((i-1)%array_length(customer_ids,1))+1];
    currency_value := CASE WHEN i%17=0 THEN 'USD' ELSE 'MXN' END;
    service_value := 18000 + ((i*2399)%72000);
    part_value := CASE WHEN i%5=0 THEN 0 ELSE 9000 + ((i*1877)%88000) END;
    total_value := service_value + part_value + CASE WHEN i%7=0 THEN 5000 ELSE 0 END;
    delivered_value := CASE WHEN status_value='entregada' THEN to_char((current_date-(6-day_number))::timestamp + time '17:00','YYYY-MM-DD"T"HH24:MI:SS') ELSE NULL END;

    INSERT INTO receptions(creation_key,customer_id,notes,created_at,updated_at)
    VALUES ('demo-week-reception-'||i,customer_id,
      CASE WHEN i%4=0 THEN 'Recepción con accesorios y condición física anotados.' ELSE 'Recepción sintética de práctica.' END,
      created_value,created_value)
    RETURNING id INTO reception_id;

    INSERT INTO orders(creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,exchange_rate,customer_id,reception_id,device_type,status,imei,unlock_code,accessories_left,physical_condition,promised_date,technician,warranty_days,delivered_at,cancel_reason)
    VALUES ('demo-week-order-'||i,created_value,created_value,
      (SELECT first_name FROM customers WHERE id=customer_id),
      (SELECT last_name FROM customers WHERE id=customer_id),'',
      brands[((i-1)%array_length(brands,1))+1],models[((i-1)%array_length(models,1))+1],
      problems[((i-1)%array_length(problems,1))+1],repair_types[((i-1)%array_length(repair_types,1))+1],
      'Orden ficticia de la semana demo #'||lpad(i::text,3,'0'),currency_value,service_value,part_value,
      CASE WHEN i%7=0 THEN 5000 ELSE 0 END,500,CASE WHEN i%7=0 THEN 1 ELSE 0 END,
      CASE WHEN currency_value='USD' THEN 17.25 ELSE NULL END,customer_id,reception_id,
      CASE WHEN i%13=0 THEN 'tableta' ELSE 'movil' END,
      CASE WHEN status_value='cancelada' THEN 'proceso' ELSE status_value END,
      '', '', CASE WHEN i%3=0 THEN 'Funda, SIM' ELSE '' END,
      CASE WHEN i%4=0 THEN 'Marco con desgaste; pantalla intacta' ELSE 'Desgaste normal de uso' END,
      CASE WHEN status_value IN ('nueva','proceso','esperando_refaccion') THEN to_char((current_date + ((i%5)-2))::date,'YYYY-MM-DD')
        WHEN status_value='terminada' THEN to_char((current_date + ((i%3)-1))::date,'YYYY-MM-DD') ELSE NULL END,
      CASE WHEN i%4=0 THEN 'Técnico Demo B' ELSE 'Técnico Demo A' END,
      CASE WHEN status_value='entregada' THEN 90 WHEN i%3=0 THEN 30 ELSE 0 END,
      delivered_value,
      CASE WHEN status_value='cancelada' THEN CASE i%6 WHEN 0 THEN 'Cliente desistió antes de iniciar' WHEN 1 THEN 'No se autorizó el presupuesto' WHEN 2 THEN 'Equipo con daño adicional detectado' WHEN 3 THEN 'Cliente no regresó para confirmar' WHEN 4 THEN 'Refacción agotada sin alternativa' ELSE 'Solicitud duplicada de demostración' END ELSE '' END)
    RETURNING id INTO order_id;
    order_ids := array_append(order_ids,order_id);

    INSERT INTO order_repairs(order_id,position,repair_type,problem,diagnosis,solution,notes,service_cents,parts_cents,review_cents,part_name,part_cost_cents,supplier_id,supplier_name,created_at,updated_at)
    VALUES(order_id,0,repair_types[((i-1)%array_length(repair_types,1))+1],problems[((i-1)%array_length(problems,1))+1],
      CASE WHEN status_value IN ('terminada','entregada') THEN 'Falla localizada; pruebas eléctricas y visuales realizadas.' ELSE 'Diagnóstico inicial en proceso.' END,
      CASE WHEN status_value IN ('terminada','entregada') THEN 'Reparación y prueba funcional completadas.' ELSE '' END,
      CASE WHEN i%5=0 THEN 'Se cotizaron dos calidades de refacción.' ELSE '' END,
      service_value,part_value,CASE WHEN i%7=0 THEN 5000 ELSE 0 END,
      parts[((i-1)%array_length(parts,1))+1],CASE WHEN part_value>0 THEN part_value/2 ELSE NULL END,
      CASE WHEN i%3=0 THEN supplier_ids[((i-1)%array_length(supplier_ids,1))+1] ELSE NULL END,
      CASE WHEN i%3=0 THEN suppliers[((i-1)%array_length(suppliers,1))+1] ELSE '' END,created_value,created_value)
    RETURNING id INTO first_repair_id;
    repair_ids := array_append(repair_ids,first_repair_id);

    -- Some receptions have two independent repairs on the same device.
    IF i%9=0 THEN
      INSERT INTO order_repairs(order_id,position,repair_type,problem,diagnosis,solution,notes,service_cents,parts_cents,review_cents,part_name,part_cost_cents,created_at,updated_at)
      VALUES(order_id,1,'Diagnóstico adicional','Falla secundaria reportada','Revisión complementaria','',
        'Segunda intervención sintética vinculada al mismo equipo.',9500,0,0,'',NULL,created_value,created_value);
    END IF;

    -- Deposits and partial/full payments cover methods and balances; cancellation comes after collection.
    IF i%4<>0 OR status_value='cancelada' THEN
      paid_value := CASE WHEN i%6=0 THEN total_value ELSE greatest(5000,total_value/3) END;
      method_value := methods[((i-1)%array_length(methods,1))+1];
      INSERT INTO payments(request_key,order_id,amount_cents,kind,method,notes,created_at)
      VALUES('demo-week-payment-'||i,order_id,paid_value,
        CASE WHEN paid_value<total_value THEN 'anticipo' ELSE 'pago' END,method_value,
        CASE WHEN paid_value<total_value THEN 'Anticipo ficticio; saldo pendiente de demostración.' ELSE 'Liquidación ficticia.' END,
        created_value);
      IF status_value='cancelada' THEN
        UPDATE orders SET status='cancelada',updated_at=created_value WHERE id=order_id;
        INSERT INTO order_resolutions(request_key,order_id,kind,amount_cents,currency,method,reason,created_at)
        VALUES('demo-week-cancel-'||i,order_id,'cancel',0,currency_value,NULL,
          (SELECT cancel_reason FROM orders WHERE id=order_id),created_value);
        IF i%24=11 THEN
          INSERT INTO order_resolutions(request_key,order_id,kind,amount_cents,currency,method,reason,created_at)
          VALUES('demo-week-refund-'||i,order_id,'refund',greatest(1,paid_value/2),currency_value,method_value,
            'Devolución parcial ficticia tras cancelación; revisar saldo devuelto.',created_value);
        END IF;
      END IF;
    ELSIF status_value='cancelada' THEN
      UPDATE orders SET status='cancelada',updated_at=created_value WHERE id=order_id;
      INSERT INTO order_resolutions(request_key,order_id,kind,amount_cents,currency,method,reason,created_at)
      VALUES('demo-week-cancel-'||i,order_id,'cancel',0,currency_value,NULL,
        (SELECT cancel_reason FROM orders WHERE id=order_id),created_value);
    END IF;

    -- Different parts/request states are visible in the order details and inbox.
    IF status_value='esperando_refaccion' OR i%4=0 OR status_value='cancelada' THEN
      part_status := CASE WHEN status_value='cancelada' THEN 'cancelada'
        WHEN status_value='entregada' THEN 'instalada'
        WHEN status_value='esperando_refaccion' AND i%2=0 THEN 'solicitada'
        WHEN status_value='esperando_refaccion' THEN 'por_verificar'
        ELSE CASE i%4 WHEN 0 THEN 'disponible' WHEN 1 THEN 'no_disponible' WHEN 2 THEN 'instalada' ELSE 'solicitada' END END;
      INSERT INTO part_requests(order_id,repair_id,name,status,internal_cost_cents,supplier,quality,note,created_at,updated_at)
      VALUES(order_id,first_repair_id,parts[((i-1)%array_length(parts,1))+1],part_status,
        CASE WHEN part_status IN ('disponible','instalada') THEN 18000+(i*1100)%50000 ELSE NULL END,
        CASE WHEN part_status IN ('disponible','instalada') THEN suppliers[((i-1)%array_length(suppliers,1))+1] ELSE '' END,
        CASE WHEN part_status IN ('disponible','instalada') THEN qualities[((i-1)%array_length(qualities,1))+1] ELSE '' END,
        'Seguimiento ficticio de solicitud de refacción.',created_value,created_value)
      RETURNING id INTO part_id;
      part_ids := array_append(part_ids,part_id);

      IF i%3<>1 THEN
        request_status := CASE WHEN status_value='cancelada' THEN 'cancelada'
          WHEN part_status='no_disponible' THEN 'atendida'
          WHEN part_status='disponible' OR part_status='instalada' THEN 'atendida'
          WHEN i%5=0 THEN 'cerrada' ELSE 'pendiente' END;
        INSERT INTO price_requests(part_request_id,repair_id,brand,model,part_name,status,notes,created_at,updated_at,closed_at)
        VALUES(part_id,first_repair_id,brands[((i-1)%array_length(brands,1))+1],models[((i-1)%array_length(models,1))+1],parts[((i-1)%array_length(parts,1))+1],request_status,
          'Solicitar precio total, calidad y tiempo de entrega. Escenario simulado.',created_value,created_value,
          CASE WHEN request_status IN ('cerrada','cancelada') THEN created_value ELSE NULL END)
        RETURNING id INTO request_id;

        FOR j IN 1..3 LOOP
          INSERT INTO price_request_suppliers(price_request_id,supplier_id,status,last_message_at,created_at)
          VALUES(request_id,supplier_ids[((i+j-2)%array_length(supplier_ids,1))+1],
            CASE WHEN j=1 AND request_status='atendida' THEN 'respondio'
              WHEN request_status='cancelada' THEN 'cancelado'
              WHEN j=3 AND i%7=0 THEN 'sin_disponibilidad' ELSE 'pendiente' END,
            CASE WHEN j=1 AND request_status='atendida' THEN created_value ELSE NULL END,created_value)
          RETURNING id INTO association_id;
          IF j=1 AND request_status='atendida' THEN
            INSERT INTO supplier_responses(price_request_supplier_id,request_key,original_message,technical_summary,price_cents,shipping_cents,quality,availability,delivery_time,needs_review,is_late,received_at)
            VALUES(association_id,'demo-week-response-'||i,
              'Respuesta ficticia: sí hay '||lower(parts[((i-1)%array_length(parts,1))+1])||' en '||lower(qualities[((i-1)%array_length(qualities,1))+1])||'; precio '||((18000+(i*1300)%65000)/100.0)::text||' más envío; entrega estimada de 1 a 3 días.',
              'Oferta sintética estructurada para la solicitud.',18000+(i*1300)%65000,CASE WHEN i%2=0 THEN 12000 ELSE 0 END,
              qualities[((i-1)%array_length(qualities,1))+1],CASE WHEN i%9=0 THEN 'bajo_pedido' ELSE 'disponible' END,
              CASE WHEN i%9=0 THEN '3 a 5 días' ELSE '1 a 2 días' END,CASE WHEN i%8=0 THEN 1 ELSE 0 END,CASE WHEN i%11=0 THEN 1 ELSE 0 END,created_value)
            RETURNING id INTO response_id;
            IF request_status='atendida' AND i%4<>0 THEN
              UPDATE price_requests SET selected_response_id=response_id,selected_supplier_id=supplier_ids[((i+1-2)%array_length(supplier_ids,1))+1],selected_at=created_value WHERE id=request_id;
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- Warranty cases only attach to delivered demo orders; all contact data remains blank.
    IF status_value='entregada' THEN
      INSERT INTO warranty_claims(request_key,order_id,reason,status,outcome,created_at,updated_at)
      VALUES('demo-week-warranty-'||i,order_id,
        CASE i%4 WHEN 0 THEN 'El cliente reporta que la pantalla presenta parpadeo después de la reparación.' WHEN 1 THEN 'La batería no conserva carga según el cliente; solicita revisión de garantía.' WHEN 2 THEN 'El centro de carga vuelve a fallar dentro del periodo de garantía.' ELSE 'El cliente nota audio intermitente tras la reparación.' END,
        CASE i%5 WHEN 0 THEN 'recibida' WHEN 1 THEN 'en_revision' WHEN 2 THEN 'esperando_pieza' WHEN 3 THEN 'resuelta' ELSE 'cerrada' END,
        CASE WHEN i%5 IN (3,4) THEN 'Caso ficticio revisado; se documentó el resultado y la prueba funcional.' ELSE '' END,
        created_value,created_value);
    END IF;
  END LOOP;

  -- Sales history with discounts, multiple tenders, voids, and stock pressure.
  FOR i IN 1..42 LOOP
    product_id := product_ids[((i*7-1)%array_length(product_ids,1))+1];
    method_value := methods[((i-1)%array_length(methods,1))+1];
    total_value := (SELECT price_cents FROM products WHERE id=product_id) * (1 + (i%3));
    INSERT INTO sales(creation_key,created_at,method,currency,total_cents,amount_received_cents,change_cents,notes,customer_id,discount_cents)
    VALUES('demo-week-sale-'||i,
      to_char((current_date-(6-((i-1)%7)))::timestamp + time '11:00' + ((i%8)*interval '51 minutes'),'YYYY-MM-DD"T"HH24:MI:SS'),
      method_value,'MXN',greatest(1,total_value-(CASE WHEN i%6=0 THEN 1500 ELSE 0 END)),
      total_value+(CASE WHEN method_value='efectivo' THEN 5000 ELSE 0 END),
      CASE WHEN method_value='efectivo' THEN 5000 ELSE 0 END,
      CASE WHEN i%6=0 THEN 'Venta demo con descuento.' ELSE 'Venta ficticia de mostrador.' END,
      customer_ids[((i-1)%array_length(customer_ids,1))+1],CASE WHEN i%6=0 THEN 1500 ELSE 0 END)
    RETURNING id INTO sale_id;
    INSERT INTO sale_items(sale_id,product_id,product_name,sku,quantity,unit_price_cents,subtotal_cents)
    SELECT sale_id,p.id,p.name,p.sku,1+(i%3),p.price_cents,p.price_cents*(1+(i%3)) FROM products p WHERE p.id=product_id;
    IF i%13=0 THEN
      UPDATE sales SET voided_at=now()::text,void_reason='Cancelación de venta ficticia para probar historial.' WHERE id=sale_id;
    END IF;
    INSERT INTO stock_movements(product_id,delta,reason,note,created_at,source_type,source_id)
    VALUES(product_id,-(1+(i%3)),'venta','Movimiento sintético asociado a venta demo.',now()::text,'demo_sale',sale_id);
  END LOOP;

  -- Some inventory procurement paths: draft, ordered, partial, received, cancelled.
  FOR i IN 1..8 LOOP
    supplier_id := supplier_ids[i];
    product_id := product_ids[((i*3-1)%array_length(product_ids,1))+1];
    status_value := CASE i WHEN 1 THEN 'borrador' WHEN 2 THEN 'solicitada' WHEN 3 THEN 'parcial' WHEN 4 THEN 'recibida' WHEN 5 THEN 'cancelada' ELSE 'solicitada' END;
    total_value := 25000 + i*3700;
    INSERT INTO purchase_orders(request_key,supplier_id,status,currency,subtotal_cents,shipping_cents,total_cents,notes,ordered_at,cancelled_at,cancel_reason,created_at,updated_at)
    VALUES('demo-week-po-'||i,supplier_id,status_value,'MXN',total_value,CASE WHEN i%2=0 THEN 12000 ELSE 0 END,
      total_value+CASE WHEN i%2=0 THEN 12000 ELSE 0 END,'Pedido sintético para probar compras y recepción.',
      CASE WHEN i>1 THEN now()::text ELSE NULL END,CASE WHEN status_value='cancelada' THEN now()::text ELSE NULL END,
      CASE WHEN status_value='cancelada' THEN 'Proveedor sin existencia; pedido demo cancelado.' ELSE '' END,now()::text,now()::text)
    RETURNING id INTO purchase_id;
    INSERT INTO purchase_order_items(request_key,purchase_order_id,destination,item_name,brand,model,quality,quantity,received_quantity,unit_cost_cents,allocated_shipping_cents,received_shipping_cents,returnable,created_at,product_id)
    VALUES('demo-week-po-item-'||i,purchase_id,'inventory',product_names[((i*3-1)%array_length(product_names,1))+1],
      brands[((i-1)%array_length(brands,1))+1],models[((i-1)%array_length(models,1))+1],qualities[((i-1)%array_length(qualities,1))+1],
      2+(i%4),CASE WHEN status_value='recibida' THEN 2+(i%4) WHEN status_value='parcial' THEN 1 ELSE 0 END,
      greatest(1000,total_value/(2+(i%4))),CASE WHEN i%2=0 THEN 12000 ELSE 0 END,CASE WHEN status_value='recibida' AND i%2=0 THEN 12000 ELSE 0 END,
      CASE WHEN i%2=0 THEN 1 ELSE 0 END,now()::text,product_id)
    RETURNING id INTO item_id;
    IF status_value IN ('parcial','recibida') THEN
      INSERT INTO purchase_receipts(request_key,purchase_order_id,received_at,notes,created_at)
      VALUES('demo-week-receipt-'||i,purchase_id,now()::text,'Recepción ficticia parcial o completa.',now()::text)
      RETURNING id INTO receipt_id;
      INSERT INTO purchase_receipt_items(receipt_id,purchase_order_item_id,quantity,unit_cost_cents,shipping_cents)
      VALUES(receipt_id,item_id,CASE WHEN status_value='recibida' THEN 2+(i%4) ELSE 1 END,greatest(1000,total_value/(2+(i%4))),CASE WHEN status_value='recibida' AND i%2=0 THEN 12000 ELSE 0 END);
    END IF;
  END LOOP;

  -- A few supplier payments, operating expenses, and drawer totals for cash review.
  FOR i IN 1..4 LOOP
    INSERT INTO supplier_payments(request_key,purchase_order_id,amount_cents,method,notes,created_at)
    SELECT 'demo-week-supplier-payment-'||i,po.id,least(po.total_cents,10000+i*2500),methods[((i-1)%array_length(methods,1))+1],
      'Pago ficticio a proveedor.',now()::text FROM purchase_orders po WHERE po.request_key='demo-week-po-'||i AND po.status<>'borrador';
  END LOOP;
  FOR i IN 1..12 LOOP
    INSERT INTO cash_outflows(request_key,kind,label,amount_cents,currency,method,notes,created_at,voided_at,void_reason)
    VALUES('demo-week-outflow-'||i,CASE WHEN i%5=0 THEN 'retiro_propietario' ELSE 'gasto' END,
      CASE i%5 WHEN 0 THEN 'Retiro de caja demo' WHEN 1 THEN 'Insumos de limpieza demo' WHEN 2 THEN 'Mensajería demo' WHEN 3 THEN 'Material de empaque demo' ELSE 'Gasto operativo demo' END,
      2500+i*725,'MXN',methods[((i-1)%array_length(methods,1))+1],'Salida ficticia para revisar caja.',now()::text,
      CASE WHEN i=12 THEN now()::text ELSE NULL END,CASE WHEN i=12 THEN 'Movimiento demo anulado.' ELSE '' END);
  END LOOP;
  FOR i IN 0..6 LOOP
    INSERT INTO cash_closings(request_key,business_date,currency,method,opening_cents,expected_cents,counted_cents,difference_cents,notes,created_at)
    SELECT 'demo-week-close-'||i||'-'||m, current_date-i, 'MXN', m, 20000, 70000+(i*1300),
      70000+(i*1300)+CASE WHEN i%3=0 THEN 2500 ELSE -800 END,
      CASE WHEN i%3=0 THEN 2500 ELSE -800 END,'Cierre ficticio para probar diferencias y métodos.',now()::text
    FROM unnest(ARRAY['efectivo','transferencia','tarjeta']) AS m;
  END LOOP;
END;
$$;

COMMIT;
