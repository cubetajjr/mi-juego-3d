# Parrilla Motor · contexto para continuar

Léelo entero antes de tocar nada. Resume lo que se ha hecho y decidido en sesiones anteriores.

## Qué es

Web de información de monoplazas en español: F1, F2, F3, F1 Academy, Fórmula Regional Europea (FRECA),
F4 España y otras series (Eurocup-3, GB3…). Calendario con cuenta atrás, horarios en la hora local de
cada visitante, clasificaciones, ganadores por ronda, noticias, estadísticas de circuitos, quiz diario,
porra del fin de semana y «Mis pilotos».

- **Publicada:** https://cubetajjr.github.io/mi-juego-3d/parrilla-motor/ (GitHub Pages, rama `main`,
  carpeta raíz del repo). Cada push a `main` la publica en 1–2 minutos.
- **Vista previa en Claude:** https://claude.ai/artifact/7aCtAabSbgRVS1uUfAxyxE («Parrilla Motor v2»).
  La versión original, hecha en un chat normal, es https://claude.ai/artifact/YAySwZ8F125wmbKnDBx7qq;
  ya no se actualiza. **La versión buena es la de este repositorio.**
- Solo se trabaja en `parrilla-motor/`. **No tocar `prototipos/`** (el juego Colonia Nova tiene su propia sesión).
- Commits directamente a `main`; no hace falta abrir pull requests.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | toda la web en un solo archivo (≈320 KB, con las fuentes incrustadas) |
| `ACTUALIZAR.md` | instrucciones para actualizar los datos (las usa la tarea automática) |
| `tools/verificar.js` | abre todas las secciones en Chromium (sin red hacia las APIs) y falla si hay errores de JavaScript |
| `tools/probar-directo.js` | prueba la capa en vivo con respuestas de prueba (después de la carrera, sesión en directo, sin conexión) |
| `manifest.webmanifest`, `sw.js`, `icon*.png`, `icon.svg` | instalable como app y funciona sin conexión |
| `og.png` | imagen al compartir el enlace |

Dentro de `index.html`: el bloque `/* ===== DATOS · instantánea <fecha> ===== */` (`const DATA`, `NEWS`,
`CIRCUITS`, `C3D`, `WIN2025`, `PORRA`, `QUIZ`) contiene todos los datos. El resto es la interfaz:
`renderHome`, `renderSeries`, `renderCircuits`/`renderCircuit`, `renderPlay` (quiz y porra), `renderLegal`,
y el router `go()`, con historial del navegador (`#f1`, `#circuitos/us-2012`, …).

Comprobar después de cada cambio: `node parrilla-motor/tools/verificar.js` y `node parrilla-motor/tools/probar-directo.js`
(los dos tienen que acabar en `OK`).
Playwright está en `/opt/node22/lib/node_modules/playwright`; la página funciona abierta como `file://`.

## Lo que ya se ha hecho

1. Copiada desde el artefacto original al repo, con un `<head>` propio.
2. Botón «atrás» y enlaces directos por sección; horarios en la zona horaria del visitante; cabecera
   compacta en móvil; pestaña activa siempre visible; compartir el quiz con el menú del móvil;
   instalable como app (manifest, iconos, service worker) e imagen para redes (`og.png`).
3. Se quitó la vuelta virtual en 3D (no gustaba). En su lugar, la sección **Circuitos**: los 23 circuitos
   de 2026 con longitud, vueltas, curvas, distancia, posición frente al resto del calendario, ganadores
   2025 y 2026 y qué categorías corren allí, con sus ganadores (`CIRC_ALIAS` empareja nombres entre series).
4. Pestañas en orden de escalera: Inicio, F1, F2, F3, F1 Academy, Fórmula Regional, F4 España, Más series,
   Circuitos, Jugar.
5. Quiz: ~290 preguntas, la mayoría generadas a partir de `DATA` (`genQuiz`), con «¿qué circuito es este?»
   por el trazado. Nunca repite una pregunta vista en el dispositivo (se guarda en `localStorage`).
6. Aviso legal con contacto: **peoplemakeithappen2007@gmail.com** (correo del proyecto; no publicar el nombre ni el correo personal del dueño) y nota de alojamiento en GitHub Pages.

## Actualización automática de los datos

Tarea programada **«Actualizar Parrilla Motor»** (`trig_01YC1EXR4yS9qJ8oPTHTiD6X`): lunes y jueves a las
8:33 (hora de Madrid). Abre una sesión nueva, sigue `ACTUALIZAR.md`, busca con WebSearch, comprueba con
`verificar.js`, hace commit en `main` e intenta actualizar también la vista previa. Primera ejecución:
lunes 26 de octubre de 2026, tras el GP de Estados Unidos.

## Datos en vivo de F1 (hecho el 23 oct 2026)

El dueño eligió la opción gratis. Bloque `/* ===== datos en vivo ===== */` de `index.html`:

- **Jolpica** (`api.jolpi.ca/ergast/f1/2026/...`): Mundial de pilotos y equipos y, para cada ronda posterior a la
  instantánea, resultados, clasificación y sprint. `applyJolpica` rehace `DATA.f1` (clasificación, `status`, `facts`,
  `title`, filas de resultados, eventos disputados), rellena `PORRA.result`, añade una noticia del ganador y detecta
  al campeón (`DATA.f1.champion`, tarjeta dorada). Parte siempre de `LIVE_BASE` (copia de la instantánea), así que
  aplicarlo varias veces no duplica nada. Solo actúa si la ronda de Jolpica es mayor que la última de `DATA`.
- **OpenF1** (`api.openf1.org/v1/...`): `sessions` del año, y por sesión `session_result`, `drivers`, `stints`, `pit`,
  `race_control` (solo coches de seguridad, banderas roja y a cuadros, sanciones) y `weather`. Se ve en el panel
  «Fin de semana» (en Inicio desde 36 h antes hasta 48 h después del GP, y siempre en la subpestaña F1 → Fin de semana):
  selector de sesiones, clasificación, estrategia de neumáticos, paradas, dirección de carrera y tiempo.
  También pone «P1 …» y «En directo» en la agenda y en el horario de la cabecera.
- Caché en `localStorage` (`parrilla.api.*`, se borra a los 5 días). Se refresca cada minuto y al volver a la pestaña;
  cada respuesta tiene su caducidad (3 min tras una sesión, 30 min el resto de la semana, 6 h la lista de sesiones).
  Límites: Jolpica 500 peticiones/hora por IP, OpenF1 30 cada 10 s. Cada visitante pide desde su navegador.
- **Torre de tiempos** (botón «Vuelta a vuelta» en el panel): se reconstruye con `/laps` de OpenF1 (inicio y duración
  de cada vuelta) más `stints`, `pit` y `race_control`: orden, diferencia con el líder y con el de delante (o «+N V»),
  última vuelta (morado = mejor de la sesión, verde = mejor personal), neumático y vueltas que lleva, «BOX»,
  coche de seguridad y bandera roja, y flechas de puestos ganados. En sesiones terminadas es una repetición con
  reproductor (×5, ×20, ×60) y barra de tiempo. Si una sesión está en marcha y `/laps` devuelve vueltas, la torre
  aparece sola «En directo» y se refresca cada 10 s: es lo que pasará con la cuenta de pago de OpenF1.
  Con la cuenta de pago habrá que pasar las peticiones por un Worker de Cloudflare que guarde la clave y cachee
  (si no, cada visitante gastaría peticiones de pago); bastará con cambiar `API.of1`.
- **Sin directo de verdad:** OpenF1 gratis no da datos durante la sesión. Mientras dura, el panel dice «En directo»
  con enlace al live timing oficial y los resultados aparecen solos unos minutos después de terminar.
- Si las APIs fallan, la web sigue con la instantánea (probado en `probar-directo.js`, escenario «sin conexión»).
- Nombres: `drvName` empareja por apellido con los nombres de `DATA` («Andrea Kimi Antonelli» → «Kimi Antonelli»);
  `teamName` normaliza equipos («Red Bull Racing» → «Red Bull», «RB F1 Team» → «Racing Bulls»).

**Sin probar contra las APIs reales:** el entorno sigue bloqueando `api.openf1.org` y `api.jolpi.ca`. El código usa los
campos documentados en el código fuente de OpenF1 (`br-g/openf1`) y en la documentación de Jolpica
(`jolpica/jolpica-f1/docs`). Lo primero de la próxima sesión, si el dueño permite esos dominios: llamar a las APIs de
verdad y comparar con `probar-directo.js`.

Siguiente paso posible (de pago): torre de tiempos al segundo con la suscripción de OpenF1 y un Worker de Cloudflare que
guarde la clave (GitHub Pages no tiene servidor). F2, F3, F4 y F1 Academy siguen sin servicio público.

## Otras ideas pendientes

- Fotos de pilotos y circuitos: solo con licencia libre (Wikimedia Commons, citando autor y licencia).
  Hay que permitir `upload.wikimedia.org`, `commons.wikimedia.org` y `www.wikidata.org` en la red del entorno.
- Las fotos y logotipos oficiales de F1 no se pueden usar, ni copiar noticias enteras.

## Sobre el dueño

Habla español y prefiere respuestas cortas y claras, sin tecnicismos. Quiere proyectos que
impresionen y que use gente de verdad. Este repositorio es público: no escribas aquí su nombre,
su correo personal ni otros datos que lo identifiquen.
