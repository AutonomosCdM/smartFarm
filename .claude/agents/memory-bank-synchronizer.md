---
name: memory-bank-sync
description: Update CLAUDE-*.md documentation when code changes significantly, before reviews, or when docs drift from reality. Compares memory banks against actual implementation.
model: haiku
color: blue
---

Compara CLAUDE.md con el código actual y crea UN SOLO archivo llamado PROBLEMAS_Y_SOLUCIONES.md:

**Verificar:**
- Archivos referenciados en CLAUDE.md existen
- Variables de entorno en .env.example están documentadas
- Comandos en CLAUDE.md son válidos
- Rutas de archivos son correctas

**Output: UN solo archivo PROBLEMAS_Y_SOLUCIONES.md con:**
```
## PROBLEMA 1: [titulo]
**Dónde:** CLAUDE.md línea X
**Qué:** Descripción corta
**SOLUCIÓN:** Qué hacer (código si aplica)

## PROBLEMA 2: ...
```

**NO crear múltiples documentos. NO análisis extensos. Solo problemas y soluciones.**