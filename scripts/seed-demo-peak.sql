-- High-volume synthetic workshop week. Run only against compose.mock.yaml's
-- isolated salvacel_demo database. Adds a labeled scenario once; no real data.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE creation_key = 'demo-peak-order-1') THEN
    RAISE EXCEPTION 'El escenario de carga demo ya existe; no se duplicó.';
  END IF;
END;
$$;

DO $$
DECLARE
  first_names text[] := ARRAY['Alex','María','Cris','Paty','Rafa','Sam','Noé','Vale','Luz','Dani','Ari','Emi','Fer','Majo','Beto','Nico','Sofi','Gael','Iris','Omar','Lía','Teo'];
  last_names text[] := ARRAY['Luna','Ríos','Vega','Solís','Paz','Cruz','Reyes','León','Mora','Nava','Gil','Roca','Silva','Ochoa','Meza','Ortiz'];
  brands text[] := ARRAY['Samsung','Apple','Motorola','Xiaomi','Huawei','OPPO','Honor','Google','OnePlus','TCL'];
  models text[] := ARRAY['Galaxy A54','iPhone 13','Moto G84','Redmi Note 13','P30 Lite','A78','X8b','Pixel 7a','Nord N30','40 XE'];
  repairs text[] := ARRAY['Cambio de pantalla','Cambio de batería','Centro de carga','Diagnóstico','Cambio de cámara','Cambio de tapa','Micrófono','Altavoz','Software','Botones laterales'];
  problems text[] := ARRAY['Pantalla estrellada; táctil intermitente','Batería se descarga rápido','No reconoce el cable de carga','Se reinicia después de una caída','Cámara con manchas','Tapa trasera despegada','Micrófono bajo','Audio distorsionado','No inicia correctamente','Botón de encendido intermitente'];
  parts text[] := ARRAY['Pantalla','Batería','Centro de carga','Flex de encendido','Cámara trasera','Tapa trasera','Micrófono','Altavoz','Software','Botonera'];
  qualities text[] := ARRAY['Original','OLED premium','Genérica','Service Pack','Compatible alta calidad','Por confirmar'];
  methods text[] := ARRAY['efectivo','transferencia','tarjeta','otro'];
  categories text[] := ARRAY['Fundas','Cargadores','Cables','Micas','Audio','Adaptadores','Energía','Almacenamiento','Accesorios','Herramientas'];
  product_kinds text[] := ARRAY['Funda antigolpes','Cargador USB-C 20W','Cable trenzado','Mica de vidrio','Audífonos Bluetooth','Adaptador USB-C','Batería externa','MicroSD 128GB','Soporte para auto','Kit de limpieza','Cubo carga rápida','Mica privacidad','Cable Lightning','Funda transparente','Protector de cámara','Bocina portátil'];
  supplier_ids integer[];
  customer_ids integer[];
  product_ids integer[];
  quote_ids integer[] := ARRAY[]::integer[];
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
  purchase_item_id integer;
  receipt_id integer;
  status_value text;
  part_status text;
  request_status text;
  method_value text;
  currency_value text;
  created_value text;
  delivered_value text;
  service_value integer;
  part_value integer;
  total_value integer;
  paid_value integer;
  quantity_value integer;
  day_number integer;
  i integer;
  j integer;
  k integer;
BEGIN
  UPDATE settings SET workshop_name='Salvacel | DEMO CARGA ALTA', phone='', whatsapp='', address='', revision=revision+1 WHERE id=1;

  -- These records intentionally contain no phone, address, credentials or real contacts.
  FOR i IN 1..350 LOOP
    INSERT INTO customers(first_name,last_name,phone,notes,created_at,updated_at)
    VALUES(first_names[((i-1)%array_length(first_names,1))+1],
      last_names[((i-1)%array_length(last_names,1))+1]||' Carga DEMO '||lpad(i::text,4,'0'),'',
      'Cliente ficticio de escenario de carga; no contactar.',now()::text,now()::text)
    RETURNING id INTO customer_id;
    customer_ids:=array_append(customer_ids,customer_id);
  END LOOP;

  FOR i IN 1..24 LOOP
    INSERT INTO suppliers(name,phone,notes,active,created_at,updated_at)
    VALUES('Proveedor DEMO Carga '||lpad(i::text,3,'0'),'','Registro sintético; mensajería externa deshabilitada.',CASE WHEN i%13=0 THEN 0 ELSE 1 END,now()::text,now()::text)
    RETURNING id INTO supplier_id;
    supplier_ids:=array_append(supplier_ids,supplier_id);
  END LOOP;

  FOR i IN 1..240 LOOP
    INSERT INTO products(sku,name,category,price_cents,cost_cents,currency,stock,active,created_at,updated_at)
    VALUES('DEMO-PEAK-'||lpad(i::text,4,'0'),product_kinds[((i-1)%array_length(product_kinds,1))+1]||' DEMO '||lpad(i::text,3,'0'),
      categories[((i-1)%array_length(categories,1))+1],3000+(i*1789%120000),1500+(i*947%70000),CASE WHEN i%29=0 THEN 'USD' ELSE 'MXN' END,
      60+(i*19%140),CASE WHEN i%31=0 THEN 0 ELSE 1 END,now()::text,now()::text)
    RETURNING id INTO product_id;
    product_ids:=array_append(product_ids,product_id);
  END LOOP;

  -- Historical price comparison and converted/unconverted quote examples.
  FOR i IN 1..140 LOOP
    currency_value:=CASE WHEN i%23=0 THEN 'USD' ELSE 'MXN' END;
    INSERT INTO quotes(creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,exchange_rate,valid_until)
    VALUES('demo-peak-quote-'||i,to_char((current_date-(6-((i-1)%7)))::timestamp+time '08:30'+(i%18)*interval '31 minutes','YYYY-MM-DD"T"HH24:MI:SS'),
      now()::text,first_names[((i-1)%array_length(first_names,1))+1],'Presupuesto DEMO carga '||lpad(i::text,4,'0'),'',
      brands[((i-1)%array_length(brands,1))+1],models[((i-1)%array_length(models,1))+1],problems[((i-1)%array_length(problems,1))+1],repairs[((i-1)%array_length(repairs,1))+1],
      CASE WHEN i%4=0 THEN 'Dos calidades cotizadas; importes ficticios.' ELSE 'Registro sintético para revisión de historial.' END,
      currency_value,12000+(i*2371%85000),CASE WHEN i%8=0 THEN 0 ELSE 6000+(i*1999%98000) END,CASE WHEN i%5=0 THEN 5000 ELSE 0 END,500,
      CASE WHEN i%5=0 THEN 1 ELSE 0 END,CASE WHEN currency_value='USD' THEN 17.25 ELSE NULL END,
      to_char((current_date+CASE WHEN i%4=0 THEN -1 ELSE 7 END)::date,'YYYY-MM-DD')) RETURNING id INTO quote_id;
    quote_ids:=array_append(quote_ids,quote_id);
  END LOOP;

  -- 700 synthetic repairs spread over a busy seven-day week, with mixed states and outcomes.
  FOR i IN 1..700 LOOP
    day_number:=(i-1)/100;
    created_value:=to_char((current_date-(6-day_number))::timestamp+time '08:00'+(i%24)*interval '24 minutes','YYYY-MM-DD"T"HH24:MI:SS');
    status_value:=CASE (i-1)%20 WHEN 0 THEN 'nueva' WHEN 1 THEN 'nueva' WHEN 2 THEN 'esperando_refaccion' WHEN 3 THEN 'esperando_refaccion'
      WHEN 4 THEN 'esperando_refaccion' WHEN 5 THEN 'proceso' WHEN 6 THEN 'proceso' WHEN 7 THEN 'proceso' WHEN 8 THEN 'proceso'
      WHEN 9 THEN 'proceso' WHEN 10 THEN 'terminada' WHEN 11 THEN 'terminada' WHEN 12 THEN 'entregada' WHEN 13 THEN 'entregada'
      WHEN 14 THEN 'entregada' WHEN 15 THEN 'cancelada' WHEN 16 THEN 'proceso' WHEN 17 THEN 'proceso' WHEN 18 THEN 'terminada' ELSE 'esperando_refaccion' END;
    customer_id:=customer_ids[((i-1)%array_length(customer_ids,1))+1];
    currency_value:=CASE WHEN i%37=0 THEN 'USD' ELSE 'MXN' END;
    service_value:=14000+(i*2837%112000);
    part_value:=CASE WHEN i%7=0 THEN 0 ELSE 5000+(i*2251%95000) END;
    total_value:=service_value+part_value+CASE WHEN i%5=0 THEN 5000 ELSE 0 END;
    delivered_value:=CASE WHEN status_value='entregada' THEN to_char((current_date-(6-day_number))::timestamp+time '17:00','YYYY-MM-DD"T"HH24:MI:SS') ELSE NULL END;

    INSERT INTO receptions(creation_key,customer_id,notes,created_at,updated_at)
    VALUES('demo-peak-reception-'||i,customer_id,'Recepción completamente ficticia de semana de carga.',created_value,created_value)
    RETURNING id INTO reception_id;
    INSERT INTO orders(creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,exchange_rate,customer_id,reception_id,device_type,status,imei,unlock_code,accessories_left,physical_condition,promised_date,technician,warranty_days,delivered_at,cancel_reason,quote_id)
    VALUES('demo-peak-order-'||i,created_value,created_value,(SELECT first_name FROM customers WHERE id=customer_id),(SELECT last_name FROM customers WHERE id=customer_id),'',
      brands[((i-1)%array_length(brands,1))+1],models[((i-1)%array_length(models,1))+1],problems[((i-1)%array_length(problems,1))+1],repairs[((i-1)%array_length(repairs,1))+1],
      'Orden ficticia de alta carga #'||lpad(i::text,4,'0'),currency_value,service_value,part_value,CASE WHEN i%5=0 THEN 5000 ELSE 0 END,500,
      CASE WHEN i%5=0 THEN 1 ELSE 0 END,CASE WHEN currency_value='USD' THEN 17.25 ELSE NULL END,customer_id,reception_id,
      CASE WHEN i%17=0 THEN 'tableta' WHEN i%41=0 THEN 'laptop' ELSE 'movil' END,
      CASE WHEN status_value='cancelada' THEN 'proceso' ELSE status_value END,'','',CASE WHEN i%4=0 THEN 'Funda, SIM' ELSE '' END,
      CASE WHEN i%6=0 THEN 'Marco golpeado; pantalla intacta' ELSE 'Desgaste normal; dato sintético' END,
      CASE WHEN status_value IN ('nueva','proceso','esperando_refaccion') THEN to_char((current_date+(i%5)-2)::date,'YYYY-MM-DD') ELSE NULL END,
      CASE WHEN i%4=0 THEN 'Técnico Demo B' WHEN i%4=1 THEN 'Técnico Demo C' ELSE 'Técnico Demo A' END,
      CASE WHEN status_value='entregada' THEN CASE WHEN i%3=0 THEN 90 ELSE 30 END ELSE 0 END,delivered_value,
      CASE WHEN status_value='cancelada' THEN CASE i%6 WHEN 0 THEN 'Cliente desistió antes de iniciar' WHEN 1 THEN 'No autorizó el presupuesto' WHEN 2 THEN 'Daño adicional detectado' WHEN 3 THEN 'Equipo no recogido' WHEN 4 THEN 'Refacción agotada' ELSE 'Registro duplicado de práctica' END ELSE '' END,
      CASE WHEN i%10=0 THEN quote_ids[((i/10-1)%array_length(quote_ids,1))+1] ELSE NULL END)
    RETURNING id INTO order_id;

    FOR j IN 0..CASE WHEN i%5=0 THEN 2 WHEN i%3=0 THEN 1 ELSE 0 END LOOP
      INSERT INTO order_repairs(order_id,position,repair_type,problem,diagnosis,solution,notes,service_cents,parts_cents,review_cents,part_name,part_cost_cents,supplier_id,supplier_name,created_at,updated_at)
      VALUES(order_id,j,repairs[((i+j-1)%array_length(repairs,1))+1],problems[((i+j-1)%array_length(problems,1))+1],
        CASE WHEN status_value IN ('terminada','entregada') THEN 'Diagnóstico de prueba concluido y validado.' ELSE 'Diagnóstico ficticio en seguimiento.' END,
        CASE WHEN status_value IN ('terminada','entregada') THEN 'Reparación simulada; pruebas funcionales aprobadas.' ELSE '' END,
        CASE WHEN i%9=0 THEN 'Trabajo adicional independiente del mismo equipo.' ELSE 'Registro sintético.' END,
        greatest(0,service_value/(1+j)),greatest(0,part_value/(1+j)),CASE WHEN i%5=0 THEN 5000 ELSE 0 END,
        parts[((i+j-1)%array_length(parts,1))+1],CASE WHEN part_value>0 THEN part_value/2 ELSE NULL END,
        CASE WHEN i%4=0 THEN supplier_ids[((i+j-1)%array_length(supplier_ids,1))+1] ELSE NULL END,
        CASE WHEN i%4=0 THEN 'Proveedor DEMO Carga '||lpad((((i+j-1)%array_length(supplier_ids,1))+1)::text,3,'0') ELSE '' END,created_value,created_value)
      RETURNING id INTO repair_id;

      IF (status_value='esperando_refaccion' OR i%6=0) AND j=0 THEN
        part_status:=CASE WHEN status_value='cancelada' THEN 'cancelada' WHEN status_value='esperando_refaccion' AND i%3=0 THEN 'solicitada'
          WHEN status_value IN ('terminada','entregada') THEN 'instalada' WHEN i%4=0 THEN 'disponible' ELSE 'por_verificar' END;
        INSERT INTO part_requests(order_id,repair_id,name,status,internal_cost_cents,supplier,quality,note,created_at,updated_at)
        VALUES(order_id,repair_id,parts[((i-1)%array_length(parts,1))+1],part_status,
          CASE WHEN part_status IN ('disponible','instalada') THEN 9000+(i*1777%72000) ELSE NULL END,
          CASE WHEN part_status IN ('disponible','instalada') THEN 'Proveedor DEMO Carga '||lpad(((i%array_length(supplier_ids,1))+1)::text,3,'0') ELSE '' END,
          CASE WHEN part_status IN ('disponible','instalada') THEN qualities[((i-1)%array_length(qualities,1))+1] ELSE '' END,
          'Solicitud ficticia para carga y seguimiento.',created_value,created_value) RETURNING id INTO part_id;
        request_status:=CASE WHEN part_status='cancelada' THEN 'cancelada' WHEN part_status IN ('disponible','instalada') THEN 'atendida' WHEN i%7=0 THEN 'cerrada' ELSE 'pendiente' END;
        INSERT INTO price_requests(part_request_id,repair_id,brand,model,part_name,status,notes,created_at,updated_at,closed_at)
        VALUES(part_id,repair_id,brands[((i-1)%array_length(brands,1))+1],models[((i-1)%array_length(models,1))+1],parts[((i-1)%array_length(parts,1))+1],request_status,
          'Cotización sintética de carga; no se envía mensaje.',created_value,created_value,CASE WHEN request_status IN ('cerrada','cancelada') THEN created_value ELSE NULL END)
        RETURNING id INTO request_id;
        FOR k IN 1..3 LOOP
          INSERT INTO price_request_suppliers(price_request_id,supplier_id,status,last_message_at,created_at)
          VALUES(request_id,supplier_ids[((i+k-2)%array_length(supplier_ids,1))+1],
            CASE WHEN request_status='cancelada' THEN 'cancelado' WHEN k=1 AND request_status='atendida' THEN 'respondio'
              WHEN k=3 AND i%4=0 THEN 'sin_disponibilidad' ELSE 'pendiente' END,
            CASE WHEN k=1 AND request_status='atendida' THEN created_value ELSE NULL END,created_value)
          RETURNING id INTO association_id;
          IF k=1 AND request_status='atendida' THEN
            INSERT INTO supplier_responses(price_request_supplier_id,request_key,original_message,technical_summary,price_cents,shipping_cents,quality,availability,delivery_time,needs_review,is_late,received_at)
            VALUES(association_id,'demo-peak-response-'||i,'Mensaje ficticio: tengo opción '||lower(qualities[((i-1)%array_length(qualities,1))+1])||' con envío incluido por confirmar.',
              'Respuesta de proveedor sintética.',12000+(i*1459%76000),CASE WHEN i%2=0 THEN 9500 ELSE 0 END,qualities[((i-1)%array_length(qualities,1))+1],
              CASE WHEN i%8=0 THEN 'bajo_pedido' ELSE 'disponible' END,CASE WHEN i%8=0 THEN '3 a 6 días' ELSE '1 a 2 días' END,
              CASE WHEN i%9=0 THEN 1 ELSE 0 END,CASE WHEN i%13=0 THEN 1 ELSE 0 END,created_value) RETURNING id INTO response_id;
            IF i%3=0 THEN UPDATE price_requests SET selected_response_id=response_id,selected_supplier_id=supplier_ids[((i-1)%array_length(supplier_ids,1))+1],selected_at=created_value WHERE id=request_id; END IF;
          END IF;
        END LOOP;
      END IF;
    END LOOP;

    -- Payments include deposits, balance completions and overpayment-safe refunds.
    IF i%5<>0 OR status_value IN ('cancelada','entregada') THEN
      paid_value:=CASE WHEN status_value='entregada' OR i%7=0 THEN total_value ELSE greatest(1000,total_value/3) END;
      method_value:=methods[((i-1)%array_length(methods,1))+1];
      INSERT INTO payments(request_key,order_id,amount_cents,kind,method,notes,created_at)
      VALUES('demo-peak-payment-'||i,order_id,paid_value,CASE WHEN paid_value<total_value THEN 'anticipo' ELSE 'pago' END,method_value,
        CASE WHEN paid_value<total_value THEN 'Anticipo sintético; saldo pendiente.' ELSE 'Pago ficticio liquidado.' END,created_value);
      IF status_value='cancelada' THEN
        UPDATE orders SET status='cancelada',updated_at=created_value WHERE id=order_id;
        INSERT INTO order_resolutions(request_key,order_id,kind,amount_cents,currency,method,reason,created_at)
        VALUES('demo-peak-cancel-'||i,order_id,'cancel',0,currency_value,NULL,(SELECT cancel_reason FROM orders WHERE id=order_id),created_value);
        IF i%4=0 THEN
          INSERT INTO order_resolutions(request_key,order_id,kind,amount_cents,currency,method,reason,created_at)
          VALUES('demo-peak-refund-'||i,order_id,'refund',greatest(1,paid_value/2),currency_value,method_value,'Devolución parcial ficticia registrada después de cancelación.',created_value);
        END IF;
      END IF;
    ELSIF status_value='cancelada' THEN
      UPDATE orders SET status='cancelada',updated_at=created_value WHERE id=order_id;
      INSERT INTO order_resolutions(request_key,order_id,kind,amount_cents,currency,method,reason,created_at)
      VALUES('demo-peak-cancel-'||i,order_id,'cancel',0,currency_value,NULL,(SELECT cancel_reason FROM orders WHERE id=order_id),created_value);
    END IF;

    IF status_value='entregada' AND i%2=0 THEN
      INSERT INTO warranty_claims(request_key,order_id,reason,status,outcome,created_at,updated_at)
      VALUES('demo-peak-warranty-'||i,order_id,
        CASE i%4 WHEN 0 THEN 'Falla recurrente reportada en garantía; caso ficticio.' WHEN 1 THEN 'Equipo vuelve por falla de carga; registro sintético.' WHEN 2 THEN 'Cliente de prueba reporta batería; sin datos de contacto.' ELSE 'Revisión preventiva simulada.' END,
        CASE i%5 WHEN 0 THEN 'recibida' WHEN 1 THEN 'en_revision' WHEN 2 THEN 'esperando_pieza' WHEN 3 THEN 'resuelta' ELSE 'cerrada' END,
        CASE WHEN i%5 IN (3,4) THEN 'Resolución ficticia documentada; prueba funcional concluida.' ELSE '' END,created_value,created_value);
    END IF;
  END LOOP;

  -- Busy point-of-sale week: 1,400 sales, some with multiple items, discounts, cash change and voids.
  FOR i IN 1..1400 LOOP
    created_value:=to_char((current_date-(6-((i-1)%7)))::timestamp+time '09:00'+(i%60)*interval '9 minutes','YYYY-MM-DD"T"HH24:MI:SS');
    method_value:=methods[((i-1)%array_length(methods,1))+1];
    currency_value:=CASE WHEN i%43=0 THEN 'USD' ELSE 'MXN' END;
    total_value:=0;
    FOR j IN 1..CASE WHEN i%5=0 THEN 3 ELSE 1+(i%2) END LOOP
      product_id:=product_ids[((i*7+j-2)%array_length(product_ids,1))+1];
      SELECT total_value+(price_cents*(1+(i+j)%3)) INTO total_value FROM products WHERE id=product_id;
    END LOOP;
    total_value:=greatest(1,total_value-CASE WHEN i%11=0 THEN 1500 ELSE 0 END);
    INSERT INTO sales(creation_key,created_at,method,currency,total_cents,amount_received_cents,change_cents,notes,customer_id,discount_cents)
    VALUES('demo-peak-sale-'||i,created_value,method_value,currency_value,total_value,
      total_value+CASE WHEN method_value='efectivo' THEN 5000 ELSE 0 END,CASE WHEN method_value='efectivo' THEN 5000 ELSE 0 END,
      CASE WHEN i%11=0 THEN 'Venta sintética con descuento.' ELSE 'Venta ficticia de mostrador, carga pico.' END,
      customer_ids[((i-1)%array_length(customer_ids,1))+1],CASE WHEN i%11=0 THEN 1500 ELSE 0 END) RETURNING id INTO sale_id;
    FOR j IN 1..CASE WHEN i%5=0 THEN 3 ELSE 1+(i%2) END LOOP
      product_id:=product_ids[((i*7+j-2)%array_length(product_ids,1))+1];
      quantity_value:=1+(i+j)%3;
      INSERT INTO sale_items(sale_id,product_id,product_name,sku,quantity,unit_price_cents,subtotal_cents)
      SELECT sale_id,p.id,p.name,p.sku,quantity_value,p.price_cents,p.price_cents*quantity_value FROM products p WHERE p.id=product_id;
      INSERT INTO stock_movements(product_id,delta,reason,note,created_at,source_type,source_id)
      VALUES(product_id,-quantity_value,'venta','Movimiento sintético de carga demo.',created_value,'demo_peak_sale',sale_id*10+j);
    END LOOP;
    IF i%97=0 THEN UPDATE sales SET voided_at=created_value,void_reason='Cancelación ficticia de punto de venta.' WHERE id=sale_id; END IF;
  END LOOP;

  -- Historical supplier price points for model/part comparison and a mixed procurement backlog.
  FOR i IN 1..450 LOOP
    supplier_id:=supplier_ids[((i-1)%array_length(supplier_ids,1))+1];
    INSERT INTO part_quotes(supplier_id,brand,model,part_name,quality,availability,warranty,cost_cents,client_price_cents,currency,notes,quoted_at)
    VALUES(supplier_id,brands[((i-1)%array_length(brands,1))+1],models[((i-1)%array_length(models,1))+1],parts[((i-1)%array_length(parts,1))+1],
      qualities[((i-1)%array_length(qualities,1))+1],CASE WHEN i%11=0 THEN 'bajo_pedido' WHEN i%9=0 THEN 'agotada' ELSE 'disponible' END,
      CASE WHEN i%4=0 THEN '90 días' ELSE '30 días' END,8000+(i*1937%88000),12000+(i*2399%125000),CASE WHEN i%31=0 THEN 'USD' ELSE 'MXN' END,
      'Historial ficticio de precio de proveedor; no contactar.',to_char((current_date-(i%45))::timestamp,'YYYY-MM-DD"T"HH24:MI:SS'));
  END LOOP;

  FOR i IN 1..84 LOOP
    supplier_id:=supplier_ids[((i-1)%array_length(supplier_ids,1))+1];
    product_id:=product_ids[((i*3-1)%array_length(product_ids,1))+1];
    status_value:=CASE i%7 WHEN 0 THEN 'borrador' WHEN 1 THEN 'solicitada' WHEN 2 THEN 'parcial' WHEN 3 THEN 'recibida' WHEN 4 THEN 'cancelada' ELSE 'solicitada' END;
    total_value:=15000+(i*2971%240000);
    INSERT INTO purchase_orders(request_key,supplier_id,status,currency,subtotal_cents,shipping_cents,total_cents,notes,ordered_at,cancelled_at,cancel_reason,created_at,updated_at)
    VALUES('demo-peak-po-'||i,supplier_id,status_value,CASE WHEN i%23=0 THEN 'USD' ELSE 'MXN' END,total_value,
      CASE WHEN i%2=0 THEN 5000 ELSE 0 END,total_value+CASE WHEN i%2=0 THEN 5000 ELSE 0 END,'Pedido de inventario sintético de carga alta.',
      CASE WHEN status_value='borrador' THEN NULL ELSE now()::text END,CASE WHEN status_value='cancelada' THEN now()::text ELSE NULL END,
      CASE WHEN status_value='cancelada' THEN 'Cancelación ficticia: proveedor sin existencia.' ELSE '' END,now()::text,now()::text) RETURNING id INTO purchase_id;
    INSERT INTO purchase_order_items(request_key,purchase_order_id,destination,item_name,brand,model,quality,quantity,received_quantity,unit_cost_cents,allocated_shipping_cents,received_shipping_cents,returnable,created_at,product_id)
    VALUES('demo-peak-po-item-'||i,purchase_id,'inventory',(SELECT name FROM products WHERE id=product_id),brands[((i-1)%array_length(brands,1))+1],models[((i-1)%array_length(models,1))+1],
      qualities[((i-1)%array_length(qualities,1))+1],2+(i%5),CASE WHEN status_value='recibida' THEN 2+(i%5) WHEN status_value='parcial' THEN 1 ELSE 0 END,
      greatest(1000,total_value/(2+(i%5))),CASE WHEN i%2=0 THEN 5000 ELSE 0 END,CASE WHEN status_value='recibida' AND i%2=0 THEN 5000 ELSE 0 END,
      CASE WHEN i%2=0 THEN 1 ELSE 0 END,now()::text,product_id) RETURNING id INTO purchase_item_id;
    IF status_value IN ('parcial','recibida') THEN
      INSERT INTO purchase_receipts(request_key,purchase_order_id,received_at,notes,created_at)
      VALUES('demo-peak-receipt-'||i,purchase_id,now()::text,'Recepción parcial/completa ficticia.',now()::text) RETURNING id INTO receipt_id;
      INSERT INTO purchase_receipt_items(receipt_id,purchase_order_item_id,quantity,unit_cost_cents,shipping_cents)
      VALUES(receipt_id,purchase_item_id,CASE WHEN status_value='recibida' THEN 2+(i%5) ELSE 1 END,greatest(1000,total_value/(2+(i%5))),CASE WHEN status_value='recibida' AND i%2=0 THEN 5000 ELSE 0 END);
    END IF;
    IF status_value IN ('solicitada','parcial','recibida') AND i%2=0 THEN
      INSERT INTO supplier_payments(request_key,purchase_order_id,amount_cents,method,notes,created_at)
      VALUES('demo-peak-supplier-payment-'||i,purchase_id,least(total_value,5000+(i*1139%40000)),methods[((i-1)%array_length(methods,1))+1],'Abono ficticio a proveedor.',now()::text);
    END IF;
  END LOOP;

  FOR i IN 1..210 LOOP
    INSERT INTO cash_outflows(request_key,kind,label,amount_cents,currency,method,notes,created_at,voided_at,void_reason)
    VALUES('demo-peak-outflow-'||i,CASE WHEN i%6=0 THEN 'retiro_propietario' ELSE 'gasto' END,
      CASE i%6 WHEN 0 THEN 'Retiro propietario demo' WHEN 1 THEN 'Insumos taller demo' WHEN 2 THEN 'Mensajería demo' WHEN 3 THEN 'Material empaque demo' WHEN 4 THEN 'Servicio local demo' ELSE 'Gasto operativo demo' END,
      1200+(i*731%28000),CASE WHEN i%41=0 THEN 'USD' ELSE 'MXN' END,methods[((i-1)%array_length(methods,1))+1],'Salida de caja sintética.',
      to_char((current_date-(6-((i-1)%7)))::timestamp+time '18:30','YYYY-MM-DD"T"HH24:MI:SS'),CASE WHEN i%67=0 THEN now()::text ELSE NULL END,
      CASE WHEN i%67=0 THEN 'Movimiento demo anulado para ejercicio.' ELSE '' END);
  END LOOP;

  FOR i IN 0..6 LOOP
    INSERT INTO cash_closings(request_key,business_date,currency,method,revision,opening_cents,expected_cents,counted_cents,difference_cents,notes,created_at)
    SELECT 'demo-peak-close-'||i||'-'||m,current_date-i,'MXN',m,2,25000,120000+i*1750,
      greatest(0,120000+i*1750+CASE WHEN i%3=0 THEN 3200 ELSE -1100 END),CASE WHEN i%3=0 THEN 3200 ELSE -1100 END,
      'Corte sintético de alta carga con diferencia revisable.',now()::text FROM unnest(ARRAY['efectivo','transferencia','tarjeta','otro']) AS m;
  END LOOP;
END;
$$;

COMMIT;
