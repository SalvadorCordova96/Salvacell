CREATE OR REPLACE FUNCTION salvacel_validate_resolution() RETURNS trigger AS $$
DECLARE
  order_currency text;
  order_status text;
  collected bigint;
  refunded bigint;
BEGIN
  SELECT currency, status INTO order_currency, order_status
  FROM orders WHERE id = NEW.order_id;
  IF order_currency IS NULL OR order_currency <> NEW.currency THEN
    RAISE EXCEPTION 'Moneda de resolución inválida.';
  END IF;
  IF NEW.kind = 'refund' THEN
    IF order_status <> 'cancelada' THEN
      RAISE EXCEPTION 'La orden debe estar cancelada antes de registrar una devolución.';
    END IF;
    SELECT COALESCE(SUM(amount_cents), 0) INTO collected
    FROM payments
    WHERE order_id = NEW.order_id AND voided_at IS NULL AND kind <> 'ajuste_historico';
    SELECT COALESCE(SUM(amount_cents), 0) INTO refunded
    FROM order_resolutions WHERE order_id = NEW.order_id AND kind = 'refund';
    IF NEW.amount_cents + refunded > collected THEN
      RAISE EXCEPTION 'La devolución supera el importe cobrado reembolsable.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER order_resolutions_validate BEFORE INSERT ON order_resolutions
FOR EACH ROW EXECUTE FUNCTION salvacel_validate_resolution();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION salvacel_reject_resolution_change() RETURNS trigger AS $$
BEGIN
  IF current_setting('salvacel.restoring', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Las resoluciones de órdenes son inmutables.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER order_resolutions_immutable BEFORE UPDATE OR DELETE ON order_resolutions
FOR EACH ROW EXECUTE FUNCTION salvacel_reject_resolution_change();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION salvacel_reject_payment_for_cancelled_order() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE id = NEW.order_id AND status = 'cancelada') THEN
    RAISE EXCEPTION 'No se puede cobrar una orden cancelada.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER payments_reject_cancelled_order BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION salvacel_reject_payment_for_cancelled_order();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION salvacel_preserve_refunded_payments() RETURNS trigger AS $$
DECLARE
  order_to_check integer;
BEGIN
  order_to_check := OLD.order_id;
  IF EXISTS (SELECT 1 FROM order_resolutions WHERE order_id = order_to_check AND kind = 'refund') THEN
    RAISE EXCEPTION 'Un pago que respalda una devolución no puede modificarse ni eliminarse.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER payments_preserve_refunded BEFORE UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION salvacel_preserve_refunded_payments();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION salvacel_preserve_warranty_claims() RETURNS trigger AS $$
BEGIN
  IF current_setting('salvacel.restoring', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'El historial de garantía no se puede eliminar.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER warranty_claims_no_delete BEFORE DELETE ON warranty_claims
FOR EACH ROW EXECUTE FUNCTION salvacel_preserve_warranty_claims();
