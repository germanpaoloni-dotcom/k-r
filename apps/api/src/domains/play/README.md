# Kör Play — dominio vacío a propósito

Este dominio está intencionalmente sin implementar. Es groundwork de Fase 2
según el roadmap de `kor-arquitectura-v2.1.md` (§25): "base arquitectónica de
Kör Play (tablas + dominio vacío, sin UI todavía)".

## Qué existe

- Las 8 tablas de `apps/api/src/db/schema.ts`: `games`, `gameSessions`,
  `gameAnswers`, `korCredits` (ledger append-only), `inventory`,
  `orbCosmetics`, `badges`, `pets`.

## Qué NO existe todavía (a propósito)

- Ningún `service.ts` ni `routes.ts` en esta carpeta.
- Ningún endpoint registrado en `app.ts` (ni `/play/*` ni `/credits/*`).
- Ninguna lógica de juego, matching, otorgamiento de créditos, ni catálogo
  de cosméticos.

## Por qué

Per roadmap: "los juegos con más sentido (los de grupo, con progresión
colectiva) necesitan que `groups` exista primero — construir Play antes
sería construir sobre una base social incompleta." `groups` es Fase 4. Kör
Play funcional es Fase 5.

## Restricción de diseño que ya aplica desde ahora

Aunque el dominio esté vacío, el schema de `kor_credits` ya está pensado
como ledger append-only (nunca una columna de balance mutable) — cuando en
Fase 5 se escriba el servicio real, esa restricción ya viene dada por la
forma de la tabla, no depende de que el código de ese momento la respete.
No hay ni habrá una operación de "retirar créditos": es una restricción
arquitectónica, no una política de producto reversible (ver
kor-arquitectura-v2.1.md §12–13).

## Cuándo tocar esta carpeta

Recién en Fase 5, cuando el roadmap lo indique explícitamente. Hasta
entonces, cualquier PR que agregue lógica acá está adelantándose al
roadmap aprobado.
