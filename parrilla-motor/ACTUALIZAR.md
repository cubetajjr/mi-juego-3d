# Cómo actualizar los datos de Parrilla Motor

Parrilla Motor es una sola página: `parrilla-motor/index.html`. Todos los datos están escritos
dentro de ese archivo, en el bloque que empieza por `/* ===== DATOS · instantánea ... ===== */`.
Actualizar la web consiste en editar esos datos, comprobar que todo carga y subir el cambio a `main`.
GitHub Pages publica la web sola en uno o dos minutos.

## Reglas

- **No inventes nada.** Cada resultado, punto u hora tiene que salir de una fuente que hayas
  leído en esta sesión (búsqueda web). Si no puedes confirmar un dato, déjalo como está.
- Busca con WebSearch: las webs oficiales (formula1.com, fiaformula2.com, etc.) suelen no poder
  abrirse directamente desde este entorno, pero los resultados de búsqueda y los medios
  especializados (Motorsport, Crash, RacingNews365, Formula Scout, SoyMotor, f4spain.org) sí.
- Contrasta los datos clave (ganador, clasificación del campeonato) con al menos dos fuentes.
- Escribe en español, con el mismo estilo que los textos que ya hay.
- Si no ha habido carreras desde la última actualización, cambia solo lo que haga falta
  (horarios confirmados, noticias) o no cambies nada y termina sin hacer commit.

## Qué actualizar

1. `const UPDATED` (arriba del todo del script) y el comentario `DATOS · instantánea <fecha>`:
   la fecha de hoy, en formato `22 oct 2026`.
2. Para cada categoría en `DATA` (`f1`, `f2`, `f3`, `aca`, `frec`, `f4`, `oth`):
   - `status`: dónde está el campeonato («Tras el GP de X · Ronda N de 23», «Temporada 2026 finalizada»).
   - `facts`: las cifras de la cabecera (líder, ventaja, carreras restantes, puntos en juego).
   - `drivers`: clasificación completa, en orden. En F1 el formato es
     `[nombre, equipo, puntos, victorias]`; en el resto, `[nombre, equipo, puntos]`.
   - `teams`: clasificación de equipos, si la categoría la tiene.
   - `title`: en F1, `racesLeft` (carreras que quedan). En el resto, `maxLeft` (puntos que quedan
     en juego) y el texto `text` explicando qué necesita cada uno. Si alguien ya es campeón,
     sustituye `title` por `champion` con una frase, como en `f3` y `frec`.
   - `results.rows`: añade una fila por cada ronda disputada, con el mismo formato que las demás.
     En F1: `[ronda, país, circuito, "d mmm", [pole], [ganador, equipo], ganador sprint o null]`.
   - `events`: marca como `done:true` (con `res:"Ganador: ..."`) las que ya se han corrido y
     añade los horarios de las próximas en `s`, en **hora UTC** (`"2026-10-31T21:00:00Z"`).
     Un tercer valor `1` en una sesión significa «hora estimada»; quítalo cuando sea oficial.
3. `const NEWS`: añade las noticias nuevas al principio (3–6 como mucho) y borra las más viejas
   para que no haya más de 10. El texto `t` y el resumen `s` son de redacción propia, nunca
   copiados; `u` es el enlace a la fuente y `src` el nombre del medio.
4. `const PORRA` (sección «jugar»):
   - Cuando termine un GP de F1, pon su resultado en `result`:
     `{pole:"Nombre",p1:"Nombre",podium:["1.º","2.º","3.º"]}`.
   - Si la porra ya tiene resultado y el GP siguiente está a menos de 6 días, cámbiala al
     siguiente: `id:"f1-2026-<ronda>"`, `title`, `lock` (inicio de la clasificación en UTC) y
     `result:null`.
5. Quiz: las preguntas sobre resultados y clasificaciones se generan solas a partir de `DATA`,
   no hay que tocarlas. En `const QUIZ` solo van preguntas que no caducan (historia,
   reglamento, curiosidades). Puedes añadir alguna nueva si es un dato seguro y comprobado.
6. Si cambia el campeón de algún campeonato, revisa también los textos de `facts` y `champion`.

## Comprobar y publicar

```bash
node parrilla-motor/tools/verificar.js     # tiene que terminar con "OK"
git add parrilla-motor/index.html
git commit -m "Update Parrilla Motor data after <evento>"
git push -u origin main
```

Si `verificar.js` da errores, arréglalos antes de subir nada. No toques el diseño ni el código
de la web en una actualización de datos.
