# ✅ Supabase Setup Completo

**Fecha:** 2025-10-02
**Proyecto:** smartFARM v3
**Base de Datos:** PostgreSQL + pgvector en Supabase

---

## 🎉 Configuración Exitosa

### Proyecto Supabase
- **Nombre:** smartFarm
- **Project Ref:** `dwkesndjrodfgpxwwefy`
- **Región:** South America (São Paulo)
- **Password:** `GcG1Thr69Id082Ir`

### Connection Strings

**Direct Connection (para desarrollo):**
```
postgresql://postgres:GcG1Thr69Id082Ir@db.dwkesndjrodfgpxwwefy.supabase.co:5432/postgres
```

**Pooler Connection (para producción):**
```
postgresql://postgres.dwkesndjrodfgpxwwefy:GcG1Thr69Id082Ir@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**Project URL:**
```
https://dwkesndjrodfgpxwwefy.supabase.co
```

**API Key (anon public):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3a2VzbmRqcm9kZmdweHd3ZWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDg3NzksImV4cCI6MjA3NDgyNDc3OX0.k9s_VT0yEjDXMDz0gK6qRqQdI4qP4qIu6m_w7U9o4Rc
```

---

## 📋 Pasos Completados

1. ✅ **Supabase CLI actualizado** - v2.47.2
2. ✅ **Proyecto local inicializado** - Carpeta `supabase/` creada
3. ✅ **Proyecto vinculado** - Link con proyecto remoto establecido
4. ✅ **Schema SQL aplicado** - Migración `20251002000000_initial_schema.sql` ejecutada
5. ✅ **Variables de entorno configuradas** - `.env.local` actualizado

---

## 📊 Schema Creado

### Tabla: `documents`

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Índices
- `idx_documents_document_id` - Búsqueda por documento
- `idx_documents_filename` - Búsqueda por nombre de archivo
- `idx_documents_embedding` - Búsqueda vectorial con IVFFlat
- `idx_documents_metadata` - Búsqueda en metadata (GIN)

### Extensiones
- ✅ `vector` - pgvector para embeddings

### Funciones y Triggers
- ✅ `update_updated_at_column()` - Auto-actualiza timestamp
- ✅ Trigger para `updated_at`

### Vistas
- ✅ `document_stats` - Estadísticas por documento

---

## 🚀 Próximos Pasos

### 1. Agregar OpenAI API Key

El sistema RAG necesita OpenAI para generar embeddings:

```bash
# Editar .env.local
OPENAI_API_KEY=sk-tu-key-aqui
```

### 2. Probar Carga de Documentos

```bash
# El servidor ya está corriendo en http://localhost:3000
# Usa la UI para subir un documento PDF, TXT o MD
```

### 3. Verificar Funcionalidad RAG

1. Sube un documento sobre agricultura
2. Haz una pregunta relacionada
3. El sistema debería recuperar contexto del documento

---

## 🔧 Comandos Útiles

```bash
# Ver estado del proyecto
supabase status

# Ver migraciones aplicadas
supabase db remote commit

# Acceder a base de datos
psql "postgresql://postgres:GcG1Thr69Id082Ir@db.dwkesndjrodfgpxwwefy.supabase.co:5432/postgres"

# Ver logs
supabase functions logs

# Dashboard web
open https://supabase.com/dashboard/project/dwkesndjrodfgpxwwefy
```

---

## ⚠️ Importante

- **Password seguro:** Guarda `GcG1Thr69Id082Ir` en tu gestor de contraseñas
- **API Keys:** No commitear `.env.local` al repositorio
- **Connection String:** Ya está configurado en `.env.local`

---

## 🎯 Estado Actual

| Feature | Estado |
|---------|--------|
| PostgreSQL con pgvector | ✅ Listo |
| Schema creado | ✅ Listo |
| Índices vectoriales | ✅ Listo |
| Connection string | ✅ Configurado |
| Groq API | ✅ Configurado |
| OpenAI API | ⚠️ Falta agregar |

**Sistema RAG:** 90% completo - Solo falta OpenAI API key para embeddings

---

## 📱 Dashboard Supabase

**URL:** https://supabase.com/dashboard/project/dwkesndjrodfgpxwwefy

Desde el dashboard puedes:
- Ver datos en tiempo real
- Ejecutar queries SQL
- Monitorear uso
- Ver logs
- Configurar backups

---

✅ **Setup completado exitosamente!**
