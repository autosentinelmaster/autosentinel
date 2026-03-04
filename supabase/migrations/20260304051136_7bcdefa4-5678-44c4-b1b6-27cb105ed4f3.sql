CREATE POLICY "System only - no direct access"
ON public.rpc_rate_limits FOR SELECT
USING (false);