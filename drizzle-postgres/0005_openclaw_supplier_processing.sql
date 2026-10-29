ALTER TABLE supplier_inbound_messages
  ADD COLUMN agent_processing_state text NOT NULL DEFAULT 'disabled'
    CHECK (agent_processing_state IN ('disabled','queued','dispatching','dispatched','proposed','failed'));
--> statement-breakpoint
ALTER TABLE supplier_inbound_messages
  ADD COLUMN agent_processing_attempts integer NOT NULL DEFAULT 0
    CHECK (agent_processing_attempts BETWEEN 0 AND 3);
--> statement-breakpoint
ALTER TABLE supplier_inbound_messages ADD COLUMN agent_processing_next_attempt_at text;
--> statement-breakpoint
ALTER TABLE supplier_inbound_messages ADD COLUMN agent_processing_started_at text;
--> statement-breakpoint
ALTER TABLE supplier_inbound_messages ADD COLUMN agent_processing_finished_at text;
--> statement-breakpoint
ALTER TABLE supplier_inbound_messages ADD COLUMN agent_processing_run_id text;
--> statement-breakpoint
ALTER TABLE supplier_inbound_messages ADD COLUMN agent_processing_error text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX idx_supplier_inbound_agent_queue
  ON supplier_inbound_messages(agent_processing_state, agent_processing_next_attempt_at, received_at);
