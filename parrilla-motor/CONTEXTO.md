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
| `tools/verificar.js` | abre todas las secciones en Chromium y falla si hay errores de JavaScript |
| `manifest.webmanifest`, `sw.js`, `icon*.png`, `icon.svg` | instalable como app y funciona sin conexión |
| `og.png` | imagen al compartir el enlace |

Dentro de `index.html`: el bloque `/* ===== DATOS · instantánea <fecha> ===== */` (`const DATA`, `NEWS`,
`CIRCUITS`, `C3D`, `WIN2025`, `PORRA`, `QUIZ`) contiene todos los datos. El resto es la interfaz:
`renderHome`, `renderSeries`, `renderCircuits`/`renderCircuit`, `renderPlay` (quiz y porra), `renderLegal`,
y el router `go()`, con historial del navegador (`#f1`, `#circuitos/us-2012`, …).

Comprobar después de cada cambio: `node parrilla-motor/tools/verificar.js` (tiene que acabar en `OK`).
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

## Pendiente: datos en directo (lo que el dueño quiere ahora)

El dueño quiere que la web se actualice **al segundo**, como una app de timing. Lo investigado:

- **OpenF1** (api.openf1.org): gratis solo da datos poco después de cada sesión. El directo exige una
  cuenta de pago con precio según uso y no publicado ([condiciones](https://tally.so/r/w2yWDb),
  [autenticación](https://openf1.org/auth.html)); aun así, `/location`, `/car_data` e `/intervals` no
  están disponibles en directo.
- **Live timing oficial de F1**: parte exige suscripción a F1 TV; no se puede leer desde el navegador
  (hace falta un servidor intermedio) y usarlo en una web pública va contra sus condiciones.
- **F2, F3, F4, F1 Academy**: no hay servicios públicos. Seguirán con la actualización automática y los
  enlaces a sus tiempos en directo.
- **GitHub Pages no tiene servidor**: una clave de pago no puede ir dentro de la web. Haría falta un
  pequeño servidor (por ejemplo, un Worker gratuito de Cloudflare) que guarde la clave.

Propuesta hecha al dueño, sin decisión todavía:
1. **Gratis:** la web consulta OpenF1 y **Jolpica** (api.jolpi.ca, sucesor de Ergast) al abrirse, para
   mostrar resultados, parrilla, vueltas rápidas y Mundial actualizado minutos después de cada sesión.
2. **De pago:** torre de tiempos en vivo, posiciones, neumáticos, paradas, banderas y mensajes de carrera
   con la suscripción de OpenF1 y un servidor en Cloudflare.

**Bloqueo:** el entorno tiene cerrado el acceso a esas APIs. El dueño debe permitir `api.openf1.org` y
`api.jolpi.ca` en la configuración de red del entorno antes de poder probar nada. No inventes respuestas
de la API: compruébalas.

## Otras ideas pendientes

- Fotos de pilotos y circuitos: solo con licencia libre (Wikimedia Commons, citando autor y licencia).
  Hay que permitir `upload.wikimedia.org`, `commons.wikimedia.org` y `www.wikidata.org` en la red del entorno.
- Las fotos y logotipos oficiales de F1 no se pueden usar, ni copiar noticias enteras.

## Sobre el dueño

Habla español y prefiere respuestas cortas y claras, sin tecnicismos. Quiere proyectos que
impresionen y que use gente de verdad. Este repositorio es público: no escribas aquí su nombre,
su correo personal ni otros datos que lo identifiquen.
