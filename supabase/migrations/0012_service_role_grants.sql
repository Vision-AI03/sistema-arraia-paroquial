-- ================================================================
-- 0012: GRANTs para service_role nas tabelas usadas pelas Edge
--       Functions do Sicredi (permission denied for table pedidos).
-- ================================================================

grant select, update on public.pedidos to service_role;
grant select         on public.pedido_setores to service_role;
grant select         on public.pedido_itens   to service_role;

notify pgrst, 'reload schema';
