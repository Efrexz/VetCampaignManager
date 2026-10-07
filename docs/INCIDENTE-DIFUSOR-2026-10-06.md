# Incidente: difusor de WhatsApp caído desde fuera (Tailscale Funnel)

**Fecha:** 4–6 octubre 2026 · **Resuelto:** 6-oct ~19:00 (Lima) · **Estado:** RESUELTO Y VERIFICADO

> **TL;DR** — Los envíos fallaban desde cualquier PC externa (`Failed to fetch` /
> `net::ERR_CONNECTION_CLOSED`) pero siempre funcionaban desde la PC donde vive
> el difusor. Causa: se activó un **segundo Funnel** de Tailscale en el mismo
> nodo y eso invalidó el ingress del `:443` en el relay (regla: **un funnel por
> nodo**). Fix: `tailscale funnel --https=10000 off`. Checklist de 30 segundos
> en §4. Regla de oro en §5: **nunca un 2º puerto de funnel en este nodo**.

## 1. Arquitectura afectada

- **Difusor (VetCampaignManager)**: Docker Desktop (WSL2) en la PC del trabajo —
  n8n (`127.0.0.1:5679`) + Evolution (`127.0.0.1:8081`) + postgres, desplegado
  con `docker-compose.pc.yml`.
- **Exposición:** Tailscale en Windows publica el Funnel:
  `:443 → 127.0.0.1:5679` (n8n) y `:8443 → 127.0.0.1:8081` (Evolution).
  Los clientes externos (oficinas, laptop) usan `https://<TAILNET-HOST>.ts.net`
  SIN tener Tailscale instalado.
- (Segundo proyecto en la misma PC: agenda de reservas — n8n `:5678`,
  Evolution `:8080` — separado del difusor.)

## 2. Síntoma

- Envíos de VetCampaignManager → webhook de n8n fallaban **100% desde PCs
  externas** (toast "No se pudo enviar la campaña" + `Failed to fetch`;
  consola Chrome: `net::ERR_CONNECTION_CLOSED`).
- Desde la PC del trabajo funcionaba **siempre** (el hairpin local no pasa por
  el ingress del relay).
- En la BD de n8n (difusor) había **hueco total de ejecuciones** en las horas
  de los fallos → los requests **nunca llegaron a n8n**: fallo de red/ingress,
  no de la app ni del webhook.

## 3. Causa raíz (confirmada por eliminación)

El 4-oct se activó un segundo Funnel en el mismo nodo para la agenda:

```
tailscale funnel --bg --https=10000 → 127.0.0.1:8080   # ❌ rompió el :443
```

**Regla técnica de Tailscale:** el ingress de Funnel se registra en el plano
de control **por nodo** y la operación confiable es **un funnel por nodo**.
Activar el segundo invalidó el registro del `:443` en el relay — aunque el CLI
seguía mostrando los tres puertos como "(Funnel on)".

⚠️ **Lección clave:** *config local viva ≠ ingress activo en el relay*. No te
fíes del `serve status` para confirmar que el funnel funciona; la única prueba
válida es un **request externo real** (§4, paso 3).

## 4. Checklist de 30 segundos (si el síntoma vuelve)

1. `tailscale funnel status` → ¿`:443` (Funnel on) → 5679 y **ningún funnel extra**?
2. `docker ps` → ¿los contenedores del difusor están `Up`?
3. **Test externo real** (celular con DATOS MÓVILES, no la wifi del local):
   ```
   curl.exe -v --max-time 15 https://<TAILNET-HOST>.ts.net/
   ```
   Si TLS completa pero cierra la conexión → ingress roto (causa de este
   incidente). Si falla antes de TLS (DNS/refused/timeout) → funnel no
   publicado o red.
4. Si todo lo anterior está OK externo y aún falla → mirar **presión de RAM**
   del VM WSL (ver §7).

## 5. Reglas operativas (lo importante)

1. 🚫 **NUNCA activar un segundo funnel en este nodo** (`:10000` o cualquier
   otro). Mata el `:443` del difusor.
2. ✅ Para exponer otro servicio, usar un **path del funnel `:443` existente**
   (un funnel soporta múltiples handlers):
   ```
   tailscale funnel --bg --set-path=/agenda http://127.0.0.1:8080
   ```
   Antes de activarlo: `tailscale funnel status` + **test externo inmediato**
   del `:443` (no hay que esperar a que un cliente lo reporte).
3. ⚠️ **`wsl --shutdown` NO usar sin ventana pactada**: mata TODO el VM
   (Docker + contenedores + túneles) y provoca cortes de minutos con el mismo
   síntoma. (Apareció ×2 en el historial el 6-oct.)

## 6. Qué se hizo y qué quedó pendiente

**Aplicado el 6-oct:**
```
tailscale funnel --https=10000 off     # desactivar el funnel de la agenda
```
Verificado: `funnel status` quedó con solo `:443 → 5679` y `:8443 → 8081`
(estado idéntico al previo al 4-oct). Test externo desde laptop y desde otra
sede: funcionando.

**Pendientes (aprobados, ejecutar en ventana de mantenimiento):**
- [ ] `C:\Users\USER\.wslconfig` — el VM WSL vive con 3.8 GiB en un host de
  7.9 GiB (casi sin holgura en Windows); con ambos stacks hay presión:
  `Database connection timed out` en n8n (×4 en 48h) y reinicios del engine:
  ```
  [wsl2]
  memory=4GB
  swap=2GB
  autoMemoryReclaim=gradual   # solo Windows 11
  ```
  Requiere `wsl --shutdown` en ventana pactada (regla §5.3).
- [ ] `N8N_PROXY_HOPS=1` en ambos composes — elimina los
  `ValidationError X-Forwarded-For` de requests que llegan por el funnel.
- [ ] Agenda: `C:\Users\USER\Documents\vercel_keys.txt` contiene una
  `EVOLUTION_API_URL` del puerto `:10000` ya muerto — actualizar si se retoma
  (path `/evolution` o URL de VPS).
- [ ] Cambiar la contraseña temporal `TemporalN8n_2026!` del owner de n8n
  (agenda) y borrar las API keys (`agente-fase2` / `fase2-retrievable`) si no
  se usan.

## 7. Recomendación estructural — VPS

La PC del trabajo como servidor tiene 4 fragilidades demostradas en este
incidente: (1) limitación de un funnel por nodo, (2) RAM insuficiente
compartida entre proyectos, (3) dependencia de que la PC esté encendida y
despierta, (4) `wsl --shutdown` / reinicios de Docker Desktop como puntos
únicos de fallo. Migrar la agenda (o el difusor) a un VPS (Hetzner CX22
~3.5 USD/mes, u Oracle Cloud Always Free) elimina las cuatro. Guía paso a
paso: `docs/GUIA-SEDES.md`.
