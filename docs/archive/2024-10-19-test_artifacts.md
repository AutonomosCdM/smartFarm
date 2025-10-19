# Prueba de Artifacts Nativo - SmartFarm

## Prompt de Prueba 1: Gráfico Simple

```
Crea un dashboard HTML interactivo para SmartFarm con:

1. Título "Dashboard de Producción - Finca El Rosal"
2. Un gráfico de barras con Chart.js mostrando:
   - Café: 500kg
   - Plátano: 800kg
   - Aguacate: 300kg
3. Una tabla HTML con los mismos datos
4. Estilos CSS modernos con colores verdes (tema agrícola)

Genera todo en un solo bloque de código HTML completo.
```

**Resultado esperado**: Panel derecho se abre con el dashboard renderizado.

---

## Prompt de Prueba 2: Canvas Interactivo

```
Crea una aplicación web simple para registrar tareas agrícolas:

- Formulario con: Tarea, Cultivo, Fecha
- Botón "Agregar Tarea"
- Lista de tareas agregadas
- Botón para eliminar cada tarea
- Estilos CSS bonitos con tema verde

Todo el código HTML, CSS y JavaScript en un solo archivo.
```

**Resultado esperado**: Aplicación funcional en el panel derecho.

---

## Prompt de Prueba 3: Visualización de Datos

```
Crea un gráfico de líneas interactivo con Plotly.js mostrando:

Temperatura promedio mensual en mi finca:
- Enero: 22°C
- Febrero: 23°C
- Marzo: 24°C
- Abril: 23°C
- Mayo: 22°C
- Junio: 21°C

Con título, etiquetas y diseño responsive.
Código HTML completo con CDN de Plotly.
```

**Resultado esperado**: Gráfico de líneas interactivo con hover.

---

## Notas

- Si funciona: El Artifacts nativo está operativo ✅
- Si no abre panel: Verifica versión de Open WebUI
- Si hay error: Revisa logs con `docker logs open-webui`
