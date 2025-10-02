# 🧪 Guía de Pruebas - smartFARM v3

## 🚀 Estado del Sistema

**Servidor:** ✅ Corriendo en http://localhost:3000

**APIs Configuradas:**
- ✅ GROQ_API_KEY - Chat funcionando
- ✅ DATABASE_URL - Supabase conectado
- ✅ Embeddings - multilingual-e5-base (local)

---

## 📋 Checklist de Pruebas

### 1. ✅ Chat Básico (FUNCIONAL)
**Endpoint:** `POST /api/chat`
**Estado:** Logs muestran `200 in 1342ms` y `200 in 1935ms`

**Cómo probar:**
1. Abrir http://localhost:3000
2. Escribir: "Hola, ¿cómo estás?"
3. Verificar respuesta en español

**Agentes disponibles:**
- Especialista en Riego
- Experto en Control de Plagas
- Analista Meteorológico
- Especialista en Manejo de Cultivos

---

### 2. 🔄 Sistema de Embeddings (PENDIENTE DE PRUEBA)

**Modelo:** multilingual-e5-base (768 dims)
**Provider:** @xenova/transformers (local)

**Primera ejecución:**
- Descargará modelo (~200MB)
- Se guardará en cache
- Puede tomar 30-60 segundos

**Prueba manual:**

```bash
# Crear documento de prueba
cat > /tmp/test-tomates.txt << 'EOF'
Guía de Riego para Tomates

El tomate requiere riego constante pero moderado.
Durante crecimiento: 2-3 veces por semana (20-30 L/m²)
Durante floración: 4-5 veces por semana

Mejor horario: mañana temprano o atardecer
Método recomendado: riego por goteo

Síntomas de falta de agua:
- Hojas marchitas
- Frutos pequeños
- Caída de flores

Síntomas de exceso:
- Hojas amarillentas
- Pudrición de raíces
EOF

# Subir documento (primera vez tomará más tiempo)
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/tmp/test-tomates.txt" \
  -w "\n%{http_code}\n"

# Esperar a ver logs de:
# "Loading multilingual-e5-base model..."
# "Model loaded successfully"
# "Processed X/Y embeddings"
```

---

### 3. 🔍 Búsqueda RAG (PENDIENTE)

**Después de subir documento:**

```bash
# Consultar con contexto RAG
curl -X POST http://localhost:3000/api/rag \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Cuándo debo regar los tomates?"}' \
  -w "\n%{http_code}\n"

# Debería retornar:
# - chunks relevantes
# - similarity scores
# - duration < 500ms
```

---

### 4. 💬 Chat con RAG Integrado

**En el navegador (http://localhost:3000):**

1. Subir documento usando UI (si existe componente)
2. O usar curl para subir
3. En chat, preguntar: "¿Cómo regar tomates?"
4. La respuesta debería incluir info del documento

**Verificar en logs:**
```
RAG retrieval took XXms
```

---

## 🐛 Troubleshooting

### Chat no responde
**Solución:**
- Verificar GROQ_API_KEY en .env.local
- Ver logs del servidor (bash_id: a578a7)
- Refrescar navegador

### Upload falla
**Posibles causas:**
1. Primera descarga del modelo
   - Esperar ~1 minuto
   - Verificar internet

2. Archivo muy grande
   - Máximo: 10MB
   - Reducir tamaño

3. Base de datos no conecta
   - Verificar DATABASE_URL
   - Probar: `supabase status`

### Embeddings lentos
**Primera vez es normal:**
- Descarga modelo: ~30-60s
- Cache para siguiente uso
- Ubicación: `~/.cache/huggingface/`

**Si persiste:**
- Verificar espacio en disco
- Ver logs: "Loading model..." debería aparecer solo 1 vez

---

## 📊 Métricas Esperadas

### Performance
- Chat (sin RAG): < 2s
- RAG retrieval: < 500ms
- Embedding generation: ~100-200ms/query
- Upload (doc pequeño): 2-5s primera vez, <1s después

### Primera Ejecución vs Subsecuentes

**Primera vez:**
```
Loading multilingual-e5-base model... (~30s)
Model loaded successfully
Generating embeddings... (~2-5s)
✓ Upload complete
```

**Siguientes veces:**
```
Generating embeddings... (~1-2s)
✓ Upload complete
```

---

## ✅ Tests Básicos

### Test 1: Chat sin RAG
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hola"}
    ],
    "agent": "crop"
  }'
```

**Esperado:** Respuesta en español del agente

### Test 2: Health Check RAG
```bash
curl http://localhost:3000/api/rag
```

**Esperado:**
```json
{
  "status": "ok",
  "documentCount": 0
}
```

### Test 3: Upload Documento
Ver comandos arriba en sección de Embeddings

### Test 4: Query con RAG
Ver comandos arriba en sección de Búsqueda RAG

---

## 🎯 Funcionalidades a Probar

- [x] Chat básico con Groq
- [x] Agentes en español
- [ ] Upload de documento
- [ ] Generación de embeddings
- [ ] Búsqueda vectorial
- [ ] RAG integrado en chat
- [ ] Cambio de agente sin perder historial
- [ ] Artifacts (código/markdown)

---

## 🔗 Enlaces Rápidos

- **UI:** http://localhost:3000
- **API Chat:** http://localhost:3000/api/chat
- **API Upload:** http://localhost:3000/api/upload
- **API RAG:** http://localhost:3000/api/rag
- **Supabase:** https://supabase.com/dashboard/project/dwkesndjrodfgpxwwefy

---

## 📝 Notas

- **Warnings de buildManifest:** Son normales en dev con Turbopack
- **Modelo se descarga una sola vez:** Paciencia en primera ejecución
- **Sin OpenAI:** Todo funciona 100% local para embeddings

---

## 🎉 Siguiente Paso

**Prueba en navegador:**
1. Abre http://localhost:3000
2. Selecciona un agente
3. Pregunta algo sobre agricultura en español
4. Verifica la respuesta

**Para RAG completo:**
1. Usa curl para subir documento
2. Espera a que termine (ver logs)
3. Haz pregunta relacionada en el chat
4. La respuesta debería usar contexto del documento

---

**Estado:** Sistema listo para pruebas manuales 🚀
