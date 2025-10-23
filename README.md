# Análisis Exploratorio de Datos - Sistema de Recomendaciones Académicas

## Integrantes del Equipo
- Santiago Martínez - 202112020
- Nicolás Klopstock - 202021352
- Erich Giusseppe - 201818220
- David Fuquen - 202021113

## Contexto del Proyecto
Este repositorio contiene los notebooks de análisis exploratorio para un sistema de recomendaciones académicas basado en clustering jerárquico. El proyecto busca transformar la consejería universitaria mediante agrupamiento de estudiantes según patrones históricos de desempeño, permitiendo recomendaciones fundamentadas en evidencia empírica.

## Objetivo
Realizar análisis exploratorio de datos (EDA) sobre ocho fuentes de información académica para validar la viabilidad de un sistema de recomendaciones de materias y créditos por semestre. El sistema agrupará estudiantes con perfiles académicos similares mediante clustering jerárquico, fundamentando la consejería en patrones históricos de éxito y riesgo.

## Alcance
Este análisis exploratorio evalúa la calidad, estructura y patrones en ocho datasets anonimizados del observatorio académico institucional:

- **Historial Estados Académicos** (616,085 registros): Trayectoria académica completa por periodo
- **Historial Materias** (4,931,740 registros): Cada materia inscrita con créditos y calificaciones
- **Historial Rendimiento Académico** (611,654 registros): Indicadores como PGA y distribución de créditos
- **Información Actual** (222,407 registros): Estado reciente con datos demográficos generalizados
- **Horarios Curso** (444,834 registros): Programación académica por periodo
- **Riesgos Históricos Pregrado** (369,370 registros): Indicadores binarios de factores de riesgo
- **Información Financiera** (793,198 registros): Modalidades de financiamiento
- **Percentiles Académicos** (158,429 registros): Rendimiento relativo por programa

## Conclusiones e Insights

### Viabilidad del Sistema
El análisis exploratorio **confirma la viabilidad técnica y pertinencia estratégica** del proyecto. Los datos demuestran patrones diferenciables y recurrentes que justifican el uso de clustering jerárquico para agrupamiento de estudiantes.

### Calidad de Datos
Calidad general notablemente buena con menos del 1% de valores nulos en variables críticas. Excepciones importantes:
- Variables de segundo programa (>80% nulos) - **descartar**
- Información pre-universitaria (35-66% nulos) - uso limitado
- Indicadores de riesgo (nulos por diseño = ausencia de riesgo)
- Valores atípicos detectados: EDAD (máx. 1935 años), CREDITOS_MAXIMOS (máx. 1,000,000) - **requieren limpieza**

### Variables Críticas Identificadas

**Capacidad académica:**
- **PERCENTIL_PGA_PROGRAMA** (variable estrella - normaliza rendimiento por programa)
- PGA (Promedio General Acumulado, media 3.97)
- PORCENTAJE_CREDITOS_APROBADOS (media 89.4%)
- PROMEDIO_SEMESTRAL (rendimiento reciente)

**Experiencia y progreso:**
- SEMESTRE_SEGUN_CREDITOS / GRUPO_SEMESTRES
- TOTAL_SEMESTRES_MATRICULADOS (media 4.84)
- CREDITOS_PGA (créditos acumulados)

**Indicadores de riesgo:**
- CREDITOS_REPROBADOS / CREDITOS_RETIRADOS
- tres_o_mas_materias_retiradas (~5% de casos)
- ESTADO_ACADEMICO (Normal 79%, Prueba, Suspensión)
- MATERIA_POR_TERCERA_VEZ

**Contexto del estudiante:**
- PROGRAMA_1 y NIVEL_PROGRAMA_1 (segmentación obligatoria)
- TIPO_MATRICULA_SEMESTRE
- CREDITOS_MAXIMOS (límite institucional)
- ESTRATO_SOCIOECONOMICO

### Hallazgos Clave
- **15% de estudiantes** presenta tasa de aprobación <50% (riesgo extremo - requieren cargas mínimas 6-9 créditos)
- **Percentil <25**: requieren cargas reducidas y materias con alta probabilidad de éxito
- **Percentil >75**: pueden manejar cargas mayores y combinaciones más desafiantes
- 52.55% no cumple requisito de lectura/inglés al sexto semestre
- Variables PROGRAMA_2 (>80% nulos) deben descartarse completamente
- La integración de datasets mediante CODIGO_ESTUDIANTE permite construir perfiles completos
- Media de 2.77 créditos por materia permite analizar redes de co-inscripción y secuencias curriculares
- Clustering debe segmentarse primero por nivel y programa antes de aplicar algoritmo

## Estructura del Repositorio

- **`notebooks/`**: Contiene todos los notebooks de análisis exploratorio de datos
- **`docs/`**: Contiene la documentación del proyecto:
  - Resumen ejecutivo y documento del punto 6 de CDA
  - `CDA_prototipo.pdf`: Prototipo de la solución
  - `Proyecto CDA_presentacion.pdf`: Presentación del proyecto

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
Los notebooks se encuentran en la carpeta `notebooks/` y pueden ejecutarse en orden según el dataset a explorar:

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
