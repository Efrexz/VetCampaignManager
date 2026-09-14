# Guía de reconstrucción del piloto — VetCampaignManager

> **Para quién es este documento:** para la persona que opere el sistema en el
> futuro (vos o tu sucesor) y para el **agente** (asistente IA) que guíe la
> reconstrucción. Si llegaste aquí con un agente, dale esta instrucción:
>
> *"Lee `docs/GUIA-RECONSTRUCCION-PILOTO.md` completo y guíame paso a paso
> para reconstruir el servidor piloto en esta PC."*
>
> **Regla de secretos:** este repo es PÚBLICO. Aquí no hay hostnames reales,
> números ni llaves — todo va como placeholder (`TU_HOSTNAME`, etc.). Los
> **valores reales están en el Notion** (respaldo de secretos) y en el
> `.env.pc` de la PC servidor. Nunca commitearlos.

---

## §1 — Historia y decisiones (cómo se llegó hasta acá)

### El punto de partida

El plan comercial original está en `docs/GUIA-SEDES.md`: backend en un VPS
(~$5/mes) con Caddy + n8n + Evolution API + Postgres, frontend en Vercel.
Ese plan es el destino final **cuando el producto se venda**.

### La decisión del piloto (por qué NO hay VPS todavía)

Mientras no hubiera venta, se decidió correr el backend con **costo cero**:

| Piloto (actual) | VPS (futuro) |
|---|---|
| PC Windows de la clínica encendida 24/7 como servidor | Servidor remoto Hetzner |
| **Tailscale Funnel** como puerta HTTPS pública (gratis, sin dominio) | Caddy + dominio propio (~$10/año) |
| URLs tipo `https://TU_HOSTNAME.ts.net` | URLs tipo `https://n8n.tuclinica.com` |
| Docker Desktop en Windows | Docker nativo en Ubuntu |

El stack Docker es **el mismo software** en ambos casos; migrar del piloto al
VPS no cambia contenedores ni workflows — solo la "puerta" pública y 10
segundos por sede (actualizar su webhook en Ajustes).

### Línea de tiempo de depuraciones (las cicatrices)

Estas fueron las fallas reales del piloto y sus soluciones — si algo parecido
aparece, la respuesta detallada está en `GUIA-SERVIDOR-LOCAL.md` (PARTE 9 y
"Solución de problemas"):

| Síntoma | Causa real | Solución |
|---|---|---|
| Evolution responde `{"code":"1-11","msg":"Invalid url."}` a TODO | `SERVER_URL` inválida (`TS_HOSTNAME` sin definir en `.env.pc` al crear el contenedor) | Definir `TS_HOSTNAME` + `docker compose up -d --force-recreate` |
| `Error: Connection Closed` al enviar (HTTP 500) | Sesión de WhatsApp de la instancia caída (no es red) | Restart del contenedor; si no, QR nuevo en el Manager |
| `docker exec` falla con "API version" | CLI de Docker más viejo que el motor | `$env:DOCKER_API_VERSION="1.44"` o actualizar Docker Desktop |
| n8n log: "requested webhook … not registered" | Webhook saliente de Evolution apuntando a ruta inexistente / workflow sin Active | Desactivar webhook saliente; verificar Path + toggle Active |
| El puerto no aparece en Docker Desktop | Contenedor creado antes de declarar el puerto en el compose | Recrear (los restarts NO aplican cambios del compose) |

**Decisión clave de arquitectura:** los workflows de n8n llaman a Evolution
por la **red interna de Docker** (`http://vcm_evolution_api:8080/...`), nunca
por la URL pública. Así el envío no depende de Tailscale ni del internet de
la clínica, y esa URL no cambia al migrar a VPS.

---

## §2 — Inventario del sistema (estado que debe quedar funcionando)

### Contenedores (proyecto Docker: `deploy`, en la PC servidor)

| Contenedor | Imagen | Puerto host (solo 127.0.0.1) | Rol |
|---|---|---|---|
| `vcm_db_evolution` | `postgres:16-alpine` | — | DB compartida Evolution + n8n |
| `vcm_evolution_api` | `evoapicloud/evolution-api:v2.3.7` | `127.0.0.1:8081 → 8080` | Puente a WhatsApp (1 instancia por sede) |
| `vcm_n8n_app` | `n8nio/n8n:2.38.5` | `127.0.0.1:5679 → 5678` | Recibe campañas y envía a Evolution |

### Túnel (Tailscale Funnel, corre en Windows)

```powershell
tailscale funnel --bg 443:http://127.0.0.1:5679   # n8n público
tailscale funnel --bg 8443:http://127.0.0.1:8081  # Evolution público
```

URLs públicas (placeholder — reales en Notion):
- `https://TU_HOSTNAME.ts.net/` → panel n8n
- `https://TU_HOSTNAME.ts.net:8443/` → Evolution (JSON "Welcome")
- `https://TU_HOSTNAME.ts.net:8443/manager` → Evolution Manager

### Instancias de Evolution (una por número de WhatsApp)

| Instancia | Sede | Estado esperado |
|---|---|---|
| `Veterinaria` | Sede principal | `connectionStatus: open` |
| `veterinaria2` | Sede 2 | `connectionStatus: open` |

(Agregar más sedes = más instancias; ver `GUIA-SERVIDOR-LOCAL.md` PARTE 6.)

### Workflows de n8n (uno por sede)

```
[Webhook POST path=sedeN, "Immediately"]
  → [Code: one item per recipient; phone sin "+" y sin símbolos;
     media = body.media[mediaKey]]
  → [IF media]
      ├─ [HTTP Request texto] → http://vcm_evolution_api:8080/message/sendText/sedeN
      └─ [HTTP Request media] → http://vcm_evolution_api:8080/message/sendMedia/sede1
```

Rutas de webhook por sede (placeholders): `webhook/SEDE1`, `webhook/SEDE2`…

### Frontend

- Desplegado en **Vercel** desde el repo (auto-deploy con push a la rama
  principal). URL placeholder: `https://TU-APP.vercel.app`
- `VITE_N8N_WEBHOOK_URL` en Vercel = **default** que apunta a la sede 1.
- Cada recepcionista pega **su** webhook en **Ajustes → Webhook de envío n8n**
  (se guarda en el localStorage de SU navegador). ⚠️ Si no lo pega, sus
  envíos salen por la sede 1.

### Dónde están los secretos y respaldos

| Item | Dónde vive | Nunca en |
|---|---|---|
| `TS_HOSTNAME`, `N8N_USER/PASSWORD`, `EVO_API_KEY`, `POSTGRES_PASSWORD` | `.env.pc` en la PC servidor + **Notion** | GitHub |
| Exports de workflows n8n (`.json`) | **Notion** | — |
| Comandos del funnel + foto del `.env.pc` | **Notion** | — |
| Datos (sesiones WhatsApp, credenciales n8n) | Volúmenes Docker `vcm_db_storage`, `vcm_n8n_storage` | — |

---

## §3 — Mapa de archivos del repo

```
deploy/
  docker-compose.pc.yml   ← EL PLANO del stack piloto (versiones fijadas)
  .env.pc.example         ← plantilla de variables (sin secretos)
  .env.pc                 ← (SOLO en la PC servidor; ignorado por git)
  docker-compose.prod.yml ← variante VPS futura (Caddy + dominio)
  Caddyfile               ← reverse proxy para la variante VPS
  .env.example            ← plantilla de variables para la variante VPS
docs/
  GUIA-SERVIDOR-LOCAL.md  ← guía operativa paso a paso (instalar, operar, depurar)
  GUIA-RECONSTRUCCION-PILOTO.md  ← ESTE documento (historia + reconstrucción)
  GUIA-SEDES.md           ← guía de distribución multi-sede con VPS (futuro comercial)
```

---

## §4 — Cómo reconstruir TODO en una PC nueva

> Esta sección asume que la PC original se perdió, se formateó o te fuiste del
> trabajo. El objetivo: mismo sistema, mismo backend, mismas sedes.

### Paso 0 — Requisitos previos (reunir antes de empezar)

- [ ] Acceso al **repo GitHub** (`git clone` al menos) y a la rama con el stack
- [ ] Acceso al **Notion** con: valores del `.env.pc`, exports de workflows,
      comandos del funnel, foto de la config
- [ ] Un **backup de datos** reciente si existe (`backup-evolution-*.sql` y
      `n8n-backup-*.tar.gz`) — ideal para no re-escanear QRs
- [ ] La **PC nueva** con Windows, con permisos de administrador

### Paso 1 — Preparar la PC (guía `GUIA-SERVIDOR-LOCAL.md` PARTE 1)

BIOS "encender tras corte de luz" → energía "nunca suspender" → Windows
Update horas activas → Docker Desktop (WSL2) → Tailscale + atributo `funnel`
en la consola admin.

### Paso 2 — Código y variables

```powershell
git clone https://github.com/admvetarielscv-crypto/VetCampaignManager.git
cd VetCampaignManager\deploy
# Reconstruir .env.pc desde el respaldo del Notion (copiar los valores)
notepad .env.pc
```

⚠️ En la PC nueva, el hostname de Tailscale **casi seguro será DIFERENTE**
(`pc-nueva.tu-tailnet.ts.net`). Decisión importante:

- **Opción A (rápida):** aceptar el nuevo hostname → actualizar `TS_HOSTNAME`
  en `.env.pc` → recrear → **avisar a cada sede** que pegue su nueva URL de
  webhook en Ajustes (10 seg por sede).
- **Opción B (transparente):** comprar dominio y migrar a Cloudflare Tunnel →
  las URLs nunca más cambian. (Es el plan de crecimiento, ver PARTE 10 de la
  guía operativa.)

### Paso 3 — Levantar el stack y el túnel

```powershell
docker compose -f docker-compose.pc.yml --env-file .env.pc up -d
tailscale funnel --bg 443:http://127.0.0.1:5679
tailscale funnel --bg 8443:http://127.0.0.1:8081
```

Verificar: `http://localhost:8081` → "Welcome…", `:8081/manager` carga,
y las URLs públicas responden desde el celular (datos móviles).

### Paso 4 — Restaurar los DATOS (sesiones y workflows)

**Opción preferida — restaurar backup** (trae de vuelta las sesiones de
WhatsApp guardadas, workflows y credenciales de n8n):

```powershell
# DB completa (sesiones de WhatsApp incluidas)
docker compose -f docker-compose.pc.yml --env-file .env.pc exec -T db `
  psql -U postgres -d evolution < backup-evolution-FECHA.sql

# n8n completo (workflows + credenciales)
docker run --rm -i -v vcm_n8n_storage:/data -v ${PWD}:/backup alpine `
  sh -c "cd / && tar xzf /backup/n8n-backup-FECHA.tar.gz"
```

Si no hay backup: recrear instancias en el Manager (QR por sede) e importar
los workflows desde los JSON del Notion (n8n → ⋮ → Import from File) →
reconectar la credencial `apikey` en cada HTTP Request.

### Paso 5 — Verificación final (checklist de humo)

- [ ] `https://TU_HOSTNAME.ts.net` → login de n8n OK
- [ ] `https://TU_HOSTNAME.ts.net:8443/` → "Welcome to the Evolution API"
- [ ] Manager → todas las instancias `connectionStatus: open`
- [ ] Envío de prueba al propio número desde el Manager (cada instancia)
- [ ] Campaña de prueba desde la app de Vercel con número propio
- [ ] Los workflows activos con los paths correctos
- [ ] Recepcionistas: su webhook en Ajustes sigue apuntando al hostname
      vigente (o se actualizó si cambió el hostname)

---

## §5 — Checklist "si me voy de este trabajo" (transferencia)

Entregar / verificar con el sucesor:

1. **GitHub**: acceso al repo `Efrexz/VetCampaignManager` (y el fork
   `admvetarielscv-crypto/VetCampaignManager` que es donde se pushea).
2. **Notion**: página con las llaves del `.env.pc`, exports de workflows,
   comandos del funnel, foto de la config. (Sin esto, el sistema no es
   recuperable.)
3. **Cuentas**: Tailscale (dueño del tailnet y del hostname), Vercel (deploy
   del frontend), Docker Hub (solo imágenes públicas, no hay cuentas
   propietarias).
4. **La PC servidor**: donde vive `C:\Users\<usuario>\Documents\campaña`,
   con sesión de Windows iniciada y Docker Desktop en auto-arranque.
5. **Celulares**: cada sede tiene un número vinculado a su instancia.
   Regla de oro: NO cerrar "Dispositivos vinculados" ni cambiar el chip.
6. **Contacto por sede**: quién avisa cuando "no envía" y el runbook corto
   (`GUIA-SERVIDOR-LOCAL.md` → "Solución de problemas").
7. **La frase mágica para un agente**: *"Lee docs/GUIA-RECONSTRUCCION-PILOTO.md
   y guíame para reconstruir/operar el servidor piloto."*

---

## §6 — Mantenimiento: qué se puede tocar sin miedo y qué no

| Acción | ¿Segura? | Nota |
|---|---|---|
| `git pull` en la PC servidor | ✅ Sí, siempre | Solo actualiza ARCHIVOS; los contenedores corriendo no se tocan |
| Editar `.env.pc` / compose y **recrear** | ⚠️ Deliberado | Backup primero; `up -d --force-recreate`; las sesiones sobreviven (viven en volúmenes) |
| Restart de un contenedor | ✅ Sí | Primer remedio ante sesiones caídas |
| Actualizar Evolution/n8n de versión | ⚠️ Deliberado | Versiones fijadas a propósito (`v2.3.7` / `2.38.5`). Evolution v2.4+ exige licencia. Backup primero. |
| Borrar volúmenes | 🚫 Nunca sin backup | Ahí viven sesiones de WhatsApp y workflows |

### Pendientes documentados (no urgen, no se olvidan)

- **Alertas automáticas** (workflow n8n que revisa instancias cada 15 min y
  avisa por WhatsApp al encargado): aprobado, aplazado. Especificación en el
  historial del chat del 2026-09.
- **Deuda: DB compartida** — n8n y Evolution usan la misma base Postgres
  (`evolution`). Funciona, pero a futuro separar (DB propia para n8n o su
  SQLite) para evitar choques de migraciones.
- **Migración a Cloudflare Tunnel / VPS** cuando el producto se venda
  (`GUIA-SEDES.md` + PARTE 10 de la guía operativa).
