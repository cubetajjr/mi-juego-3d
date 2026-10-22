# Colonia Nova · Esperanza · pruebas

Todas las pruebas se hicieron con Chromium sin pantalla (Playwright) y el renderizador por software
SwiftShader: las capturas y los recuentos de dibujo son válidos, los FPS no.

## Lo que se probó

| Prueba | Resultado |
| --- | --- |
| Carga del juego, portada y partida nueva | sin errores de JavaScript ni de consola |
| Día: movimiento con teclado, recogida de chatarra | funciona; ARIA y objetivo se actualizan |
| Construir (tienda con miniaturas), colocar edificios | funciona |
| Noche: oleada, torretas, láser, mortero, soldados, ingenieros | funciona; los alienígenas atacan y mueren |
| Los seis alienígenas, incluida la reina | aparecen, se animan (moverse/atacar) y se pueden matar |
| Lluvia de meteoritos | funciona, deja cristales |
| Exploración: nave estrellada, nido, cristales, cápsula | funciona |
| Introducción completa (0–32 s) y botón «Saltar» | funciona; la colonia aparece después del choque |
| Final del capítulo 1 tras la noche 10 | la nave despega, se marca `shipGone` y empieza el capítulo 2 |
| Partida de la v3 en `localStorage` | se migra: edificios, nivel del núcleo, noches y tropas |
| Guardar y recargar | la partida persiste (clave propia `colonia-nova-esperanza`) |
| Móvil 390×844 | sin desbordamiento horizontal; ARIA ya no tapa los botones |

## Inspector de canvas (`threejs-qa-release`), pasada `v4-pass-2`

| Captura | Entropía | Bordes | Contraste | Color dominante | Resultado |
| --- | --- | --- | --- | --- | --- |
| escritorio · día | 4.30 | 0.151 | 123.0 | 0.182 | PASS |
| escritorio · combate nocturno | 4.85 | 0.132 | 119.4 | 0.199 | PASS |
| escritorio · exploración | 5.00 | 0.183 | 120.3 | 0.157 | PASS |
| móvil · combate nocturno | 5.05 | 0.212 | 117.8 | 0.243 | PASS |

`check_evidence.py`: 4 capturas confirmadas.

## Rendimiento (recuento del renderizador)

| Escena | Llamadas de dibujo | Triángulos |
| --- | --- | --- |
| Noche con 5 alienígenas, 4 edificios extra y 3 tropas | 408 | 365 000 |
| Escena de estrés: 14 alienígenas, 9 edificios, 3 tropas | 542 (374 sin sombras) | 584 000 |

Presupuesto orientativo de la guía: 300 llamadas en escritorio y 150 en móvil. Se ha bajado de 670 a
408 unificando materiales (colores de vértice sobre 9 materiales en total) y limitando qué piezas
proyectan sombra. Sigue por encima: cada personaje son 10–18 piezas animadas por separado. El siguiente
paso es exportar cada personaje como una sola malla con esqueleto (2–3 llamadas por personaje).
En móviles se desactivan las sombras de los personajes y se reduce la resolución.

## Puntuación visual (escala 0–3 de la guía)

| Categoría | v3 | Esperanza | Motivo |
| --- | --- | --- | --- |
| Dirección de arte | 1 | 2.5 | colonia de náufragos en un desierto alienígena: nave, planeta con anillos, paleta naranja/turquesa también en la interfaz |
| Protagonista | 1 | 2 | astronauta con casco, visor, mochila y fusil, animado, con linterna y anillo; pequeño a la distancia de cámara |
| Enemigos | 1 | 2.5 | seis siluetas distintas con animación de ataque, color de señal propio, destello al recibir daño y salpicadura al morir |
| Recompensas e interactuables | 1 | 2 | chatarra, cristales con columna de luz, cápsula con tapa, nido; chispas, sonido y aviso en el marcador |
| Mundo | 1 | 2 | dunas, acantilados, flora agrupada, restos del choque; dentro de la colonia el suelo queda despejado para construir |
| Materiales | 1 | 2 | papeles de material compartidos, biseles y colores por pieza; sin texturas pintadas ni calcomanías en los modelos |
| Iluminación | 1 | 2.5 | ACES, bloom en emisivos, día, atardecer y noche, sombras, luces del reactor, los portales y los destellos |
| Efectos | 1 | 2.5 | fogonazos, trazadoras, chispas, humo, explosiones con quemaduras, ácido, partículas de los portales, estelas de meteoritos |
| Interfaz | 1 | 2.5 | chips con iconos, reloj de día/noche, objetivo, ARIA, portada, cinemáticas, miniaturas reales |
| Rendimiento | 1 | 2 | recuentos medidos y documentados; por encima del presupuesto en escenas grandes |

Media de esta edición: **2.25**. El umbral «premium» de la guía es 2.3 con todas las categorías ≥ 2, así que queda
justo por debajo. Lo que lo subiría: personajes con esqueleto (rendimiento), texturas o calcomanías en
edificios y nave (materiales) y un protagonista algo más grande o con más presencia a la distancia de juego.

## Capturas

- [Portada](portada.jpg) · [Día](dia.jpg) · [Combate nocturno](noche-combate.jpg) · [Exploración](exploracion.jpg)
- [Intro: el choque](intro-choque.jpg) · [Intro: la colonia](intro-colonia.jpg) · [Final: despegue](final-despegue.jpg)
- [Móvil de noche](movil-noche.jpg) · [Modelos de edificios](modelos-edificios.jpg)
