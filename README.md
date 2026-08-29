# CONVERTIDOR BOUCHER CEPA — OFICINA 3006 — PREPARATORIA ABIERTA ESTADO DE VERACRUZ

> Generador 100% offline para solicitudes de examen. Si no envías el PDF por WhatsApp a Oficina 3006, **NO es válido bajo ninguna circunstancia**.

**Oficina 3006 · PWA instalable · Guinda #9B2247 · Verde #1E5B4F · Dorado #A57F2C**

## ¿Qué hace?
1. **Paso 1 — Sube tu boucher:** foto o PDF (1 por solicitud). Solo JPG/PNG/WEBP/PDF.
2. **Paso 2 — Anota tus datos:** nombre, matrícula, etapa, oficina `3006` (editable), materias 1-22 con buscador (escribe número o nombre, si no existe igual vale).
3. **Paso 3 — Descarga y envía:** genera PDF con boucher sin tapar texto, descarga cuantas veces quieras **y envía obligatoriamente por WhatsApp al +52 1 783 208 5248**.

## Reglas oficiales
- **Horario de pago:** banco / banca electrónica **lunes a viernes 9:00 AM a 5:00 PM**. Fuera de ese horario **NO se hace válido**.
- **Costo:** **$101 por examen** — Ej. 2 materias = $202 (informativo).
- **Oficina:** `3006` pre-llenada, editable.
- **Envío obligatorio:** al terminar debes enviar el PDF por WhatsApp a **+52 1 783 208 5248** → botón `Enviar mensaje a la oficina`.

## Características
- **Frontend puro:** React + Vite + pdf-lib. Sin backend, sin servidor. Tus fotos **nunca salen del dispositivo**.
- **PWA super lista:** instalable en Android/iOS, funciona offline (`workbox` 18 precache), `manifest` con iconos 192/512 maskable, `apple-touch-icon`, `shortcuts`, `file_handlers`, `theme #9B2247`.
- **Botón de instalación:** banner inteligente Android (`beforeinstallprompt`) e instrucciones iOS (`Compartir → Agregar a pantalla de inicio`).
- **1 archivo por solicitud:** reemplaza automático, vista previa arriba y dato `0.05 MB · Imagen` debajo, botón `Quitar` gigante para abuelito.
- **Validación amable:** muestra **todos** los errores `•` y hace scroll al campo, detecta HEIC (iPhone) y archivos >12 MB.
- **Materias sin límite:** agrega cuantas quieras, buscador con `fold` sin acentos, `S/N` para libres.
- **PDF blindado:** columnas estrictas (`LEFT 350 + GAP 18 + RIGHT 152`), `ensureSpace` con paginación, imagen solo en portada derecha, nunca tapa texto.
- **Privacidad:** `idb-keyval` guarda solo `name/matricula/etapa/oficina` si marcas `Recordar` (desactivado por defecto). Si lo desmarcas, hace `del()` y borra.
- **Diseño abuelito:** `56-62px` tap targets, `17-18px` fuentes, contraste 7:1, `focus-visible 3px guinda`, `prefers-reduced-motion`, fondo blanco `#FFFFFF` (antes degradado), animaciones precisísimas no marean en móvil.
- **Icono acorde:** `ClipboardCheck` guinda + `icon.svg` clipboard con placa `3006` dorada y check verde.

## Instalación
```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/
```

## Desplegar
### Netlify (recomendado)
1. Sube a GitHub (este repo)
2. Netlify → Add new site → Import → elige repo → detecta `netlify.toml`
3. Build: `npm run build` / Publish: `dist`

### Manual
```bash
npm run build
# arrastra dist/ a Netlify Drop
```

## PWA
Instala desde el banner superior o menú del navegador → `Instalar app` / en iPhone `Compartir → Agregar a pantalla de inicio`. Funciona offline gracias a `sw.js` + `workbox`.

## Estructura
```
src/
  App.jsx              # Flujo 3 pasos, 1 archivo, materias, WhatsApp
  components/PWAInstall.jsx # Banner instalación iOS/Android
  lib/known.js         # 22 materias 1-22
  lib/pdf.js           # PDF con columnas y paginación
  lib/storage.js       # idb-keyval sin materias
  lib/validation.js    # zod
  styles.css           # Guinda/Verde/Dorado + animaciones
public/
  icon.svg, pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png
```

## Licencia
Uso interno Oficina 3006 — Preparatoria Abierta Veracruz.
