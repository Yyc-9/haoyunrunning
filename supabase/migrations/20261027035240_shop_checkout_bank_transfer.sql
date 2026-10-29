-- Repair the payment method without replacing inventory/specification logic.
-- Applied to production as migration 20261027035240 on 2026-10-27.
-- Pickup is fulfillment; checkout collects a bank-transfer reference.
do $repair$
declare
  v_definition text;
  v_old constant text := $old$0, 'pending_transfer', 'pickup', '', null, '', true$old$;
  v_new constant text := $new$0, 'pending_transfer', 'bank_transfer', '', null, '', true$new$;
begin
  select pg_get_functiondef('public.create_shop_order_with_specs(text,uuid,text,text,text,text,jsonb)'::regprocedure)
    into v_definition;
  if strpos(v_definition, v_old) > 0 then
    if (length(v_definition) - length(replace(v_definition, v_old, ''))) / length(v_old) <> 1 then
      raise exception 'Unexpected checkout function: payment insert is not unique';
    end if;
    execute replace(v_definition, v_old, v_new);
  elsif strpos(v_definition, v_new) = 0 then
    raise exception 'Unexpected checkout function: payment insert not recognized';
  end if;
end;
$repair$;

