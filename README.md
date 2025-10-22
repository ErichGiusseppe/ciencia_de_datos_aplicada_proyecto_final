# Análisis Exploratorio de Datos Académicos

## Integrantes del Equipo
- [Agregar nombres de los integrantes]

## Objetivo
Realizar un análisis exploratorio de datos (EDA) sobre ocho fuentes de información académica para desarrollar un sistema de recomendaciones de materias y créditos a inscribir por semestre, basado en clusterización jerárquica de estudiantes con perfiles académicos similares.

## Alcance
El proyecto analiza las siguientes fuentes de datos:
- Historial de estados académicos de estudiantes
- Historial de materias cursadas
- Historial de rendimiento académico
- Horarios de cursos
- Información actual de estudiantes
- Información financiera
- Percentiles académicos por programa
- Riesgos históricos académicos (pregrado)

## Conclusiones Principales

### Calidad de Datos
La calidad general es buena, con la mayoría de datasets presentando menos del 1% de valores nulos en variables críticas. Se identificaron valores atípicos en variables como EDAD y CREDITOS_MAXIMOS que requieren limpieza previa.

### Variables Críticas Identificadas
**Capacidad académica:**
- PERCENTIL_PGA_PROGRAMA (normalizado por programa)
- PGA (Promedio General Acumulado)
- PORCENTAJE_CREDITOS_APROBADOS

**Indicadores de riesgo:**
- CREDITOS_REPROBADOS / CREDITOS_RETIRADOS
- Variables de riesgos históricos (tres_o_mas_materias_retiradas, etc.)
- ESTADO_ACADEMICO (Normal, Prueba, Suspensión)

**Contexto del estudiante:**
- PROGRAMA_1 y NIVEL_PROGRAMA_1
- SEMESTRE_SEGUN_CREDITOS
- TIPO_MATRICULA_SEMESTRE

### Hallazgos Clave
- Variables relacionadas con segundo programa (PROGRAMA_2) presentan >80% nulos y deben descartarse
- El 98% de estudiantes están matriculados en periodo actual
- Estudiantes con percentil <25 requieren cargas reducidas; percentil >75 pueden manejar cargas mayores
- 14.94% de estudiantes tienen tasa de aprobación <50%, indicando riesgo extremo
- La integración de datasets mediante CODIGO_ESTUDIANTE permite construir perfiles completos

## Instrucciones de Ejecución

### Requisitos
- Python 3.10.12
- Dependencias listadas en `requirements.txt`

### Instalación
```bash
# Instalar dependencias
pip install -r requirements.txt
```

### Ejecución de Notebooks
Los notebooks pueden ejecutarse en orden según el dataset a explorar:

1. `historial_estados_academicos_estudiante_anonymized.ipynb`
2. `historial_materias_estudiante_anonymized.ipynb`
3. `historial_rendimiento_academico_estudiante_anonymized.ipynb`
4. `horarios_curso_anonymized.ipynb`
5. `informacion_actual_estudiante_anonymized.ipynb`
6. `informacion_financiera_estudiante_anonymized.ipynb`
7. `percentiles_academicos_estudiante_anonymized.ipynb`
8. `riesgos_historicos_estudiante_pregrado_anonymized.ipynb`

Cada notebook asume que los datos están en la carpeta `../data/` con formato `.parquet`.

## Dependencias Principales
- pandas: Manipulación de datos
- numpy: Operaciones numéricas
- matplotlib: Visualizaciones
- seaborn: Visualizaciones estadísticas
- ydata-profiling: Perfilado automático de datos (opcional)
- pyarrow: Lectura de archivos parquet

Para más detalles sobre versiones específicas, consultar `requirements.txt`.
