-- Synthetic inbox examples for the isolated Salvacel demo database only.
BEGIN;
DO $$
DECLARE
  active_association integer;
  active_supplier integer;
  active_ref text;
  response_association integer;
  response_supplier integer;
  response_ref text;
  cancelled_association integer;
  cancelled_supplier integer;
  cancelled_ref text;
  cancelled_candidates jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM supplier_inbound_messages WHERE external_message_id LIKE 'demo-week-inbox-%') THEN
    RAISE EXCEPTION 'Los ejemplos de bandeja demo ya existen; no se duplicaron.';
  END IF;

  SELECT prs.id,prs.supplier_id,prs.correlation_ref INTO active_association,active_supplier,active_ref
  FROM price_request_suppliers prs JOIN price_requests pr ON pr.id=prs.price_request_id
  WHERE pr.status='pendiente' AND prs.status='pendiente'
  ORDER BY prs.id DESC LIMIT 1;

  SELECT prs.id,prs.supplier_id,prs.correlation_ref INTO response_association,response_supplier,response_ref
  FROM price_request_suppliers prs JOIN supplier_responses sr ON sr.price_request_supplier_id=prs.id
  ORDER BY prs.id DESC LIMIT 1;

  SELECT prs.id,prs.supplier_id,prs.correlation_ref INTO cancelled_association,cancelled_supplier,cancelled_ref
  FROM price_request_suppliers prs JOIN price_requests pr ON pr.id=prs.price_request_id
  WHERE pr.status='cancelada' OR prs.status='cancelado'
  ORDER BY prs.id DESC LIMIT 1;

  SELECT jsonb_agg(id) INTO cancelled_candidates
  FROM (SELECT prs.id FROM price_request_suppliers prs JOIN price_requests pr ON pr.id=prs.price_request_id
        WHERE pr.status='cancelada' OR prs.status='cancelado' ORDER BY prs.id DESC LIMIT 2) c;

  INSERT INTO supplier_inbound_messages(channel,external_message_id,sender_hash,sender_hint,conversation_hash,supplier_id,original_message,received_at,correlation_ref,status,candidate_association_ids,review_reason,created_at,agent_processing_state,linked_price_request_supplier_id,reviewed_at)
  VALUES
    ('simulated','demo-week-inbox-unmatched','demo-hash-unmatched','Proveedor Demo sin identificar',NULL,NULL,
      'Mensaje ficticio sin referencia suficiente: ¿todavía ocupan la pieza?',now()::text,NULL,'unmatched','[]'::jsonb,
      'No se pudo identificar proveedor ni solicitud.',now()::text,'disabled',NULL,NULL),
    ('simulated','demo-week-inbox-review','demo-hash-review',(SELECT name FROM suppliers WHERE id=active_supplier),NULL,active_supplier,
      'Mensaje ficticio para revisar: sí tengo dos calidades; una original y otra genérica.',now()::text,active_ref,'needs_review',jsonb_build_array(active_association),
      'La respuesta simulada debe revisarse antes de asociarla y estructurar ofertas.',now()::text,'disabled',NULL,NULL),
    ('simulated','demo-week-inbox-ambiguous','demo-hash-ambiguous',(SELECT name FROM suppliers WHERE id=active_supplier),NULL,active_supplier,
      'Mensaje ficticio ambiguo: la pantalla que preguntaste sí la tengo.',now()::text,NULL,'ambiguous',
      (SELECT jsonb_agg(id) FROM (SELECT prs.id FROM price_request_suppliers prs WHERE prs.supplier_id=active_supplier AND prs.status='pendiente' ORDER BY prs.id DESC LIMIT 2) c),
      'Hay varias solicitudes pendientes para este proveedor; no debe asociarse automáticamente.',now()::text,'disabled',NULL,NULL),
    ('simulated','demo-week-inbox-linked','demo-hash-linked',(SELECT name FROM suppliers WHERE id=response_supplier),NULL,response_supplier,
      'Mensaje ficticio ya relacionado: precio y envío registrados como oferta de demostración.',now()::text,response_ref,'linked',jsonb_build_array(response_association),
      'Ejemplo de respuesta vinculada a una cotización.',now()::text,'disabled',response_association,now()::text),
    ('simulated','demo-week-inbox-late','demo-hash-late',(SELECT name FROM suppliers WHERE id=cancelled_supplier),NULL,cancelled_supplier,
      'Mensaje ficticio tardío: ya llegó la pieza, pero la solicitud estaba cancelada.',now()::text,cancelled_ref,'late',COALESCE(cancelled_candidates,'[]'::jsonb),
      'La solicitud se cerró antes de recibir el mensaje; solo conservar en historial.',now()::text,'disabled',NULL,NULL),
    ('simulated','demo-week-inbox-ignored','demo-hash-ignored','Proveedor Demo',NULL,NULL,
      'Mensaje ficticio marcado para ignorar en la práctica.',now()::text,NULL,'ignored','[]'::jsonb,
      'Ejemplo de mensaje que el usuario decidió ignorar.',now()::text,'disabled',NULL,NULL);
END;
$$;
COMMIT;
