CREATE TABLE order_resolutions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 request_key TEXT NOT NULL UNIQUE,
 order_id INTEGER NOT NULL REFERENCES orders(id),
 payment_id INTEGER REFERENCES payments(id),
 kind TEXT NOT NULL CHECK(kind IN ('cancel','refund')),
 amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents)='integer' AND ((kind='cancel' AND amount_cents=0 AND method IS NULL) OR (kind='refund' AND amount_cents>0 AND method IN ('efectivo','transferencia','tarjeta','otro')))),
 currency TEXT NOT NULL CHECK(currency IN ('MXN','USD')),
 method TEXT,
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),
 created_at TEXT NOT NULL,
 CHECK(payment_id IS NULL)
);
CREATE INDEX idx_order_resolutions_order ON order_resolutions(order_id,created_at);
CREATE INDEX idx_order_resolutions_payment ON order_resolutions(payment_id);
CREATE TRIGGER resolutions_no_update BEFORE UPDATE ON order_resolutions BEGIN SELECT RAISE(ABORT,'Las resoluciones son inmutables.'); END;
CREATE TRIGGER resolutions_no_delete BEFORE DELETE ON order_resolutions BEGIN SELECT RAISE(ABORT,'Las resoluciones son inmutables.'); END;
CREATE TRIGGER resolutions_validate BEFORE INSERT ON order_resolutions BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM orders WHERE id=NEW.order_id AND currency=NEW.currency) THEN RAISE(ABORT,'Moneda de resolución inválida.') END;
 SELECT CASE WHEN NEW.kind='refund' AND (NOT EXISTS (SELECT 1 FROM orders WHERE id=NEW.order_id AND status='cancelada') OR NEW.amount_cents+COALESCE((SELECT SUM(amount_cents) FROM order_resolutions WHERE order_id=NEW.order_id AND kind='refund'),0)>COALESCE((SELECT SUM(amount_cents) FROM payments WHERE order_id=NEW.order_id AND voided_at IS NULL AND kind<>'ajuste_historico'),0)) THEN RAISE(ABORT,'La devolución supera lo cobrado reembolsable o la orden no está cancelada.') END;
END;
CREATE TRIGGER cancelled_order_no_payment BEFORE INSERT ON payments WHEN EXISTS (SELECT 1 FROM orders WHERE id=NEW.order_id AND status='cancelada') BEGIN SELECT RAISE(ABORT,'No se puede cobrar una orden cancelada.'); END;
CREATE TRIGGER refunded_payment_no_update BEFORE UPDATE ON payments WHEN EXISTS (SELECT 1 FROM order_resolutions WHERE order_id=OLD.order_id AND kind='refund') AND (NEW.order_id<>OLD.order_id OR COALESCE((SELECT SUM(amount_cents) FROM order_resolutions WHERE order_id=OLD.order_id AND kind='refund'),0)>COALESCE((SELECT SUM(amount_cents) FROM payments WHERE order_id=OLD.order_id AND id<>OLD.id AND voided_at IS NULL AND kind<>'ajuste_historico'),0)+CASE WHEN NEW.voided_at IS NULL AND NEW.kind<>'ajuste_historico' THEN NEW.amount_cents ELSE 0 END) BEGIN SELECT RAISE(ABORT,'El pago respalda devoluciones registradas.'); END;
CREATE TRIGGER refunded_payment_no_delete BEFORE DELETE ON payments WHEN COALESCE((SELECT SUM(amount_cents) FROM order_resolutions WHERE order_id=OLD.order_id AND kind='refund'),0)>COALESCE((SELECT SUM(amount_cents) FROM payments WHERE order_id=OLD.order_id AND id<>OLD.id AND voided_at IS NULL AND kind<>'ajuste_historico'),0) BEGIN SELECT RAISE(ABORT,'El pago respalda devoluciones registradas.'); END;
