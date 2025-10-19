# LITEFARM INTEGRATION PLAN

**STATUS:** 🔵 PENDING APPROVAL (Not started)
**Strategy:** INCREMENTAL ADDITIVE (No Migration)
**Timeline:** 4-5 semanas | **Effort:** 140-174 horas
**Prerequisites:** User demand + business case approval

**Current Focus:** Phases 1-3 COMPLETE (see `.claude/roadmap.md`)
**This plan represents:** Phase 5 (Future enhancement)

---

## 📊 DASHBOARD DE PROGRESO

### Phase 1: QUALIFYING - LiteFarm Deployment
**Status:** ⏳ Pending | **Target:** Semana 1 | **Effort:** 20-24h

- [ ] 1.1 Crear docker-compose.litefarm.yml
- [ ] 1.2 Configurar environment variables (.env.litefarm)
- [ ] 1.3 Deploy PostgreSQL + Redis + MinIO
- [ ] 1.4 Deploy LiteFarm API (puerto 5001)
- [ ] 1.5 Deploy LiteFarm Web (puerto 3000)
- [ ] 1.6 Configurar SSL certificate (litefarm.smartfarm.example)
- [ ] 1.7 Inicializar database con schema
- [ ] 1.8 Crear usuario admin
- [ ] 1.9 Verificar health endpoints
- [ ] 1.10 Crear farm de prueba con 5 animales

**Success Criteria:**
- ✅ LiteFarm accesible vía browser https://litefarm.smartfarm.example
- ✅ API responde en /health con status 200
- ✅ Puede CRUD animals/tasks manualmente

---

### Phase 2: RACE PACE - MCP Server
**Status:** ⏳ Pending | **Target:** Semana 2-3 | **Effort:** 50-60h

- [ ] 2.1 Setup MCP server TypeScript project
- [ ] 2.2 Implementar JWT authentication handler
- [ ] 2.3 Implementar tool: litefarm_animals_list
- [ ] 2.4 Implementar tool: litefarm_animals_get
- [ ] 2.5 Implementar tool: litefarm_animals_create
- [ ] 2.6 Implementar tool: litefarm_animals_update
- [ ] 2.7 Implementar tool: litefarm_tasks_list
- [ ] 2.8 Implementar tool: litefarm_tasks_create
- [ ] 2.9 Implementar tool: litefarm_expenses_list
- [ ] 2.10 Implementar tool: litefarm_sales_list
- [ ] 2.11 Error handling + logging
- [ ] 2.12 Configurar MCP server en Open WebUI settings
- [ ] 2.13 Testing: Query "Muéstrame todos los animales"
- [ ] 2.14 Testing: Command "Crea tarea vacunación"
- [ ] 2.15 Performance testing (response time < 2s)

**Success Criteria:**
- ✅ Desde chat Open WebUI: queries funcionan
- ✅ Desde chat Open WebUI: commands ejecutan
- ✅ Response time p95 < 2s

---

### Phase 3: PODIUM - AI Intelligence Layer
**Status:** ⏳ Pending | **Target:** Semana 4 | **Effort:** 40-50h

- [ ] 3.1 GDP Calculator Tool
  - [ ] 3.1.1 Función calcula ganancia diaria peso
  - [ ] 3.1.2 Top 10/20 rankings
  - [ ] 3.1.3 Integration con LiteFarm animal data
- [ ] 3.2 Weight Projection Tool
  - [ ] 3.2.1 Setup StatsForecast
  - [ ] 3.2.2 Modelo proyección peso futuro
  - [ ] 3.2.3 Intervalo de confianza 95%
- [ ] 3.3 Anomaly Detection
  - [ ] 3.3.1 Detectar bajo rendimiento GDP
  - [ ] 3.3.2 Detectar pérdida de peso
  - [ ] 3.3.3 Sistema de alertas automáticas
- [ ] 3.4 Dashboard Generator
  - [ ] 3.4.1 Visualizaciones markdown
  - [ ] 3.4.2 Integration con export_excel_tool.py
  - [ ] 3.4.3 Templates: GDP report, Projection report

**Success Criteria:**
- ✅ "Proyecta peso animal #123 en 90 días" → proyección + IC
- ✅ "Top 10 animales mejor GDP" → ranking correcto
- ✅ Anomalía detectada → alerta generada

---

### Phase 4: CHAMPIONSHIP - Production Hardening
**Status:** ⏳ Pending | **Target:** Semana 5+ | **Effort:** 30-40h

- [ ] 4.1 Monitoring
  - [ ] 4.1.1 Prometheus exporters
  - [ ] 4.1.2 Grafana dashboard
  - [ ] 4.1.3 Alerts configurados
- [ ] 4.2 Backup Strategy
  - [ ] 4.2.1 PostgreSQL backup diario (cron)
  - [ ] 4.2.2 Backup a S3 cada 6 horas
  - [ ] 4.2.3 Restore testing
- [ ] 4.3 Performance Optimization
  - [ ] 4.3.1 Redis cache para queries frecuentes
  - [ ] 4.3.2 Query optimization PostgreSQL
  - [ ] 4.3.3 Load testing (100 concurrent users)
- [ ] 4.4 Documentation
  - [ ] 4.4.1 User guide agricultores
  - [ ] 4.4.2 API reference developers
  - [ ] 4.4.3 Runbook operaciones

**Success Criteria:**
- ✅ Uptime > 99.5% (verified 30 días)
- ✅ Response time p95 < 1s
- ✅ Backups funcionando (verified restore)
- ✅ Docs completos

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│  AWS Lightsail (98.87.30.163)                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EXISTING (ZERO CHANGES):                               │
│  ┌───────────────────────────────────────────┐          │
│  │ Open WebUI (puerto 3001)                  │          │
│  │ ├─ DuckDB (/tmp/smartfarm_persistent.db) │          │
│  │ ├─ Redis (cache 256MB)                   │          │
│  │ ├─ SQLite (webui.db)                     │          │
│  │ └─ Tools:                                │          │
│  │    ├─ csv_analyzer_tool.py               │          │
│  │    ├─ sql_cache_tool.py                  │          │
│  │    ├─ export_excel_tool.py               │          │
│  │    └─ cache_admin_tool.py                │          │
│  └───────────────────────────────────────────┘          │
│              ↓                                          │
│         MCP Protocol                                    │
│              ↓                                          │
│  NEW SERVICES:                                          │
│  ┌───────────────────────────────────────────┐          │
│  │ LiteFarm MCP Server (puerto 9099)         │          │
│  │ ├─ 8 core tools                          │          │
│  │ ├─ JWT auth handler                      │          │
│  │ └─ Error handling + logging              │          │
│  └───────────────────────────────────────────┘          │
│              ↓                                          │
│         REST API + JWT                                  │
│              ↓                                          │
│  ┌───────────────────────────────────────────┐          │
│  │ LiteFarm Stack                            │          │
│  │ ├─ LiteFarm API (puerto 5001)            │          │
│  │ ├─ LiteFarm Web (puerto 3000)            │          │
│  │ ├─ PostgreSQL 13 (puerto 5432)           │          │
│  │ ├─ Redis 7.0 (puerto 6379)               │          │
│  │ └─ MinIO S3 (puerto 9000)                │          │
│  └───────────────────────────────────────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 KEY METRICS

### Performance Targets
- **Response Time (queries normales):** < 2s
- **Response Time (proyecciones complejas):** < 5s
- **Uptime:** > 99.5%
- **Error Rate:** < 0.1%

### Usage Metrics (Track Weekly)
- Queries por día
- Animales tracked
- Tasks creadas vía AI
- Hit rate MCP cache

### Business Metrics
- **Time to Insight:** De upload Excel a dashboard < 30s
- **User Satisfaction:** Score > 4/5
- **Features más usadas:** Top 3 tracking

---

## ⚠️ RISK ASSESSMENT

### BAJO RIESGO ✅

**Why Low Risk:**
1. No toca sistema existente (additive approach)
2. LiteFarm es producción-ready (7,000+ users)
3. Deployment incremental (test cada phase)
4. Rollback simple (stop containers)

**Mitigación por Phase:**
- **Phase 1:** Test en local antes de AWS deployment
- **Phase 2:** Extensive testing MCP tools en sandbox
- **Phase 3:** Validate proyecciones contra datos reales
- **Phase 4:** Load testing antes de producción

### Rollback Plan
```bash
# Si algo falla, rollback simple:
cd /home/ubuntu/smartfarm_v5
docker-compose -f docker-compose.litefarm.yml down

# Sistema original sigue funcionando sin interrupción
```

---

## 📦 DELIVERABLES

### Phase 1
- `docker-compose.litefarm.yml` - LiteFarm stack definition
- `.env.litefarm` - Environment configuration
- `litefarm-setup.md` - Setup documentation

### Phase 2
- `mcp-litefarm-server/` - MCP server codebase
  - `src/tools/` - 8 tool implementations
  - `src/auth/` - JWT handler
  - `src/utils/` - Error handling, logging
- `mcp-litefarm-config.json` - Open WebUI configuration

### Phase 3
- `tools/gdp_calculator_tool.py` - GDP calculations
- `tools/weight_projection_tool.py` - StatsForecast projections
- `tools/anomaly_detection_tool.py` - Anomaly alerts
- `tools/dashboard_generator_tool.py` - Visualization generator

### Phase 4
- `monitoring/prometheus.yml` - Prometheus config
- `monitoring/grafana-dashboard.json` - Grafana dashboard
- `scripts/backup-litefarm.sh` - Backup automation
- `docs/user-guide.md` - User documentation
- `docs/api-reference.md` - Developer documentation

---

## 💰 EFFORT ESTIMATE

| Phase | Timeline | Effort | Cost (@ $100/h) |
|-------|----------|--------|-----------------|
| 1. Qualifying | 3-4 días | 20-24h | $2,000-2,400 |
| 2. Race Pace | 8-10 días | 50-60h | $5,000-6,000 |
| 3. Podium | 6-8 días | 40-50h | $4,000-5,000 |
| 4. Championship | 5-7 días | 30-40h | $3,000-4,000 |
| **TOTAL** | **4-5 semanas** | **140-174h** | **$14,000-17,400** |

**Comparison:**
- Building from scratch: 6+ weeks, 200+ hours, $20,000+
- **This approach:** 5 weeks, 150 hours, $15,000
- **Savings:** 25% time, 25% cost, + production-ready system

---

## 🚀 NEXT IMMEDIATE STEPS (When Approved)

1. **Create `docker-compose.litefarm.yml`**
   - PostgreSQL, Redis, MinIO, LiteFarm services
   - Network configuration
   - Volume mappings

2. **Configure `.env.litefarm`**
   - Database credentials
   - JWT secret
   - S3 configuration
   - Port mappings

3. **Deploy LiteFarm Stack**
   ```bash
   cd /home/ubuntu/smartfarm_v5
   docker-compose -f docker-compose.litefarm.yml up -d
   ```

4. **Verify Deployment**
   - Health checks
   - Database connectivity
   - Web access

5. **Initialize Database**
   - Run migrations
   - Create admin user
   - Create test farm with animals

---

## 📝 NOTES

- **Backup before Phase 1:** Full backup de sistema actual
- **Testing environment:** Use local Docker first, then AWS
- **Documentation:** Update `.claude/tech-stack.md` after each phase
- **Monitoring:** Start tracking metrics desde Phase 1

---

**Last Updated:** 2025-10-19
**Status:** Planning Complete, Awaiting Approval
**Next Review:** Before Phase 1 execution
