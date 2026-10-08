-- VetCampaignManager — 0011: alta de cliente Happy Friends (NO es migración de esquema)
--
-- Igual que 0004: este script NO altera tablas. Crea los DATOS de un cliente:
--   1. El tenant (la veterinaria)
--   2. Sus branches (sedes)
--   3. La membresía del owner (branch_id NULL = ve todas las sedes)
--   4. Categorías + plantilla "Predeterminada" clonadas a cada sede
--
-- REQUISITO ANTES DE EJECUTAR:
--   El usuario owner YA debe existir en Supabase:
--   Authentication → Users → Add User (email + clave, usuario confirmado).
--   Si no existe, el script falla a propósito y NO inserta nada.
--
-- CÓMO USARLO (SQL Editor de Supabase):
--   1. Edita la sección "EDITA AQUÍ" (ya está llena con los datos de
--      Happy Friends; falta solo el email del owner).
--   2. Ejecuta UNA sola vez.
--   3. Debe presentar un notice: "Tenant Happy Friends (happyfriends)
--      creado con 1 sede(s)". Si dice un error, no se insertó nada.
--
-- Al final del archivo: bloque para recepcionistas (comentado) y la
-- checklist para reutilizar este archivo con la próxima veterinaria.

do $$
declare
  -- ── EDITA AQUÍ (pre-llenado con Happy Friends) ──────────────────────────
  v_tenant_name  text := 'Happy Friends';           -- nombre visible
  v_tenant_slug  text := 'happyfriends';            -- slug único, minúsculas
  v_country_code text := '+51';
  -- Pendiente: pegar el email del owner cuando lo pasen (debe existir en
  -- Authentication → Users; ver REQUISITO arriba).
  v_owner_email  text := 'vethappyfriends@gmail.com';
  -- Sedes: siempre en formato ARRAY, tengas 1 o 5 (el loop lo maneja igual).
  v_branch_names text[] := ARRAY['Happy Friends'];
  v_seed_base    boolean := true;                    -- clonar categorías base
  -- ────────────────────────────────────────────────────────────────────────

  v_tenant_id bigint;
  v_owner_id  uuid;
  v_branch_id bigint;
  v_many      boolean;
  b           record;
begin
  -- ── 1. Tenant ──
  -- Nota: el trigger on_tenant_created ya crea automáticamente su fila en
  -- clinic_settings (webhook vacío) — no hay que insertarla a mano. La
  -- membresía owner NO se auto-agrega porque esto corre desde el SQL Editor
  -- (auth.uid() es NULL ahí) — por eso se agrega abajo a mano.
  insert into public.tenants (slug, name, default_country_code)
  values (v_tenant_slug, v_tenant_name, v_country_code)
  returning id into v_tenant_id;

  -- ── 2. Owner: debe existir en auth.users (Authentication → Users) ──
  select u.id into v_owner_id
  from auth.users u
  where lower(u.email) = lower(v_owner_email)
  limit 1;
  if v_owner_id is null then
    raise exception 'No existe el usuario % en auth.users. Créalo primero en Authentication → Users.', v_owner_email;
  end if;

  insert into public.tenant_members (tenant_id, user_id, role, branch_id)
  values (v_tenant_id, v_owner_id, 'owner', null)
  on conflict (tenant_id, user_id) do nothing;

  -- ── 3. Branches ──
  v_many := array_length(v_branch_names, 1) > 1;
  for b in select unnest(v_branch_names) as name
  loop
    insert into public.branches (tenant_id, name)
    values (v_tenant_id, b.name)
    returning id into v_branch_id;

    -- ── 4. (Opcional) set base: categorías + plantilla por sede ──
    if v_seed_base then
      insert into public.categories (id, tenant_id, branch_id, name) values
        ('cat_' || v_tenant_slug || '_' || v_branch_id || '_vacuna',      v_tenant_id, v_branch_id, 'Vacuna'),
        ('cat_' || v_tenant_slug || '_' || v_branch_id || '_antipulgas',  v_tenant_id, v_branch_id, 'Antipulgas'),
        ('cat_' || v_tenant_slug || '_' || v_branch_id || '_hidratacion', v_tenant_id, v_branch_id, 'Hidratación');

      -- {{owner}} renderiza el PRIMER nombre del cliente (ver lib/template).
      -- El sufijo "(sede)" solo cuando hay varias sedes — evita duplicados
      -- tipo "de Happy Friends (Happy Friends)" en clientes de una sede.
      insert into public.message_templates (id, tenant_id, branch_id, category_id, name, body, is_default)
      values (
        'tpl_' || v_tenant_slug || '_' || v_branch_id || '_default',
        v_tenant_id, v_branch_id, null,
        'Predeterminada',
        'Hola {{owner}} 👋' || chr(10) || chr(10) ||
        'Te escribimos de ' || v_tenant_name
          || case when v_many then ' (' || b.name || ')' else '' end
          || ' porque {{pet}} tiene pendiente {{category}}.' || chr(10) ||
        '¿Podrías agendar una cita esta semana? Quedamos atentos.',
        true
      );
    end if;
  end loop;

  raise notice 'Tenant % (%) creado con % sede(s). Owner: %',
    v_tenant_name, v_tenant_slug, array_length(v_branch_names, 1), v_owner_email;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Asignar recepcionista (Happy Friends NO lo usa hoy: la única cuenta es el
-- owner). Para usarlo: crea el usuario en Authentication → Users, luego
-- descomenta y edita SOLO los 2 valores marcados. Una ejecución por persona.
-- Tip: si el resultado dice "INSERT 0 0", el email no existe en Auth —
-- revisa que esté escrito igual (sin espacios, minúsculas/mayúsculas dan igual).
-- ─────────────────────────────────────────────────────────────────────────────

-- insert into public.tenant_members (tenant_id, user_id, role, branch_id)
-- select t.id, u.id, 'recepcionista', b.id
-- from public.tenants t
-- join public.branches  b on b.tenant_id = t.id and b.name = 'Happy Friends'  -- ← sede del usuario
-- join auth.users       u on lower(u.email) = lower('EMAIL_RECEPCIONISTA')   -- ← email del usuario
-- where t.slug = 'happyfriends'                                              -- ← slug del tenant
-- on conflict (tenant_id, user_id) do update set branch_id = excluded.branch_id, role = excluded.role;

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÓXIMAS VETERINARIAS — copia este archivo completo y cambia solo:
--   1. v_tenant_name  → nombre visible de la nueva clínica.
--   2. v_tenant_slug  → slug ÚNICO en minúsculas (no se puede repetir).
--   3. v_owner_email  → email del owner (creado primero en Authentication).
--   4. v_branch_names → sus sede(s), siempre como ARRAY.
--   5. Si trae recepcionistas: crea sus usuarios y ejecuta el bloque
--      de arriba una vez por persona (email + sede).
-- Después del alta: cada sede contro su webhook en la app (Ajustes →
-- Conexión con la sede activa) o por SQL:
--   update public.branches set webhook_url = 'https://n8n...'
--   where tenant_id = (select id from public.tenants where slug = '…')
--     and name = '…';
-- Lo demás (clinic_settings, permisos RLS) queda solo — las clínicas no se
-- ven entre sí.
-- ─────────────────────────────────────────────────────────────────────────────
