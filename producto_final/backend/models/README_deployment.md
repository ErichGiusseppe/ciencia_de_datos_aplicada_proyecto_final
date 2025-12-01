# Sistema LADA - Guía de Deployment

## Descripción

Sistema de Recomendación Académica con Clustering Multinivel (LADA - Learning Analytics Dashboard for Academic Advising). Este sistema predice la probabilidad de éxito de un estudiante dado un conjunto de cursos planificados.

## Arquitectura del Sistema

El sistema LADA utiliza **clustering jerárquico multinivel** con tres niveles de especificidad:

- **NIVEL_3**: Clustering por combinación exacta de cursos (más específico)
- **NIVEL_2**: Clustering por categorías de cursos (especificidad media)
- **NIVEL_1**: Clustering por cantidad de cursos (menos específico, fallback)

El sistema **selecciona automáticamente** el nivel más específico que tenga suficientes datos históricos para garantizar predicciones confiables.

## Archivos del Sistema

```
proyecto/
├── models/
│   ├── lada_modelo.pkl              # Modelo entrenado (generado)
│   ├── lada_funciones.py            # Funciones auxiliares
│   └── README_deployment.md         # Esta documentación
└── notebooks/
    ├── LADA_sistema_recomendacion_multinivel.ipynb  # Entrenamiento
    └── LADA_carga_modelo.ipynb      # Carga y uso del modelo
```

## Instalación

### Prerequisitos

```bash
pip install pandas numpy scikit-fuzzy scikit-learn matplotlib seaborn
```

### Verificar Archivos

Asegúrese de tener:
1. `models/lada_modelo.pkl` - Modelo entrenado
2. `models/lada_funciones.py` - Funciones auxiliares
3. Datos de estudiantes con PGA (si desea predicciones personalizadas)

## Uso Rápido

### 1. Cargar el Modelo

```python
import pickle
import sys
sys.path.append('./models')
from lada_funciones import predecir_estudiante_api

# Cargar modelo
with open('./models/lada_modelo.pkl', 'rb') as f:
    modelo = pickle.load(f)

resultados_por_nivel = modelo['resultados_por_nivel']
df_estudiantes = modelo['df_estudiantes']
```

### 2. Hacer Predicción

```python
# Predicción para estudiante existente
resultado = predecir_estudiante_api(
    estudiante_id='EST_00012345',
    lista_cursos=['CRS_00017889', 'CRS_00017890', 'CRS_00017891'],
    df_estudiantes=df_estudiantes,
    resultados_por_nivel=resultados_por_nivel
)

print(f"Probabilidad de éxito: {resultado['probabilidad_exito']*100:.1f}%")
print(f"Confianza: {resultado['confianza']}")
print(f"Nivel usado: {resultado['nivel_usado']}")
```

### 3. Resultado Completo

```python
{
    'estudiante_id': 'EST_00012345',
    'num_cursos': 3,
    'cursos': ['CRS_00017889', 'CRS_00017890', 'CRS_00017891'],
    'probabilidad_exito': 0.953,           # 95.3% probabilidad de éxito
    'nivel_usado': 'NIVEL_3',              # Nivel jerárquico utilizado
    'razon': 'Estudiante MAINSTREAM: ...',  # Explicación
    'cluster_id': 2,                        # ID del cluster asignado
    'num_estudiantes_similares': 87,       # Casos históricos similares
    'confianza': 'ALTA',                    # ALTA/MEDIA/BAJA
    'total_clusters': 5                     # Total clusters en el nivel
}
```

## Funciones Disponibles

### `predecir_estudiante_api()`
**Uso recomendado para aplicaciones.**

```python
predecir_estudiante_api(
    estudiante_id,      # str: ID del estudiante
    lista_cursos,       # list: Lista de códigos de cursos
    df_estudiantes,     # DataFrame: Información de estudiantes
    resultados_por_nivel # dict: Clusters entrenados
)
```

**Retorna:** dict con predicción completa

### `predecir_probabilidad_exito()`
**Función principal (más control).**

```python
predecir_probabilidad_exito(
    estudiante_perfil,   # dict: {'estudiante_id', 'cursos', 'num_cursos', 'creditos'}
    df_inscripciones,    # None en producción
    df_estudiantes,      # DataFrame: Información de estudiantes
    resultados_por_nivel # dict: Clusters entrenados
)
```

### `seleccionar_nivel_adaptativo()`
**Selección automática de nivel jerárquico.**

Intenta niveles de mayor a menor especificidad según disponibilidad de datos:
- NIVEL_3: requiere ≥20 casos similares
- NIVEL_2: requiere ≥10 casos similares
- NIVEL_1: requiere ≥5 casos similares

### `extraer_categoria_curso()`
**Clasificación de cursos por categoría.**

```python
extraer_categoria_curso('CRS_00017889')  # → 'CAT_000'
```

## Integración en Aplicaciones

### API REST con Flask

```python
# app.py
from flask import Flask, request, jsonify
import pickle
import sys
sys.path.append('./models')
from lada_funciones import predecir_estudiante_api

app = Flask(__name__)

# Cargar modelo al inicio
with open('./models/lada_modelo.pkl', 'rb') as f:
    modelo = pickle.load(f)

resultados_por_nivel = modelo['resultados_por_nivel']
df_estudiantes = modelo['df_estudiantes']

@app.route('/predecir', methods=['POST'])
def predecir():
    """
    Endpoint de predicción

    Request:
        {
            "estudiante_id": "EST_00012345",
            "cursos": ["CRS_00017889", "CRS_00017890"]
        }

    Response:
        {
            "probabilidad_exito": 0.953,
            "confianza": "ALTA",
            "nivel_usado": "NIVEL_3",
            ...
        }
    """
    data = request.json

    resultado = predecir_estudiante_api(
        data['estudiante_id'],
        data['cursos'],
        df_estudiantes,
        resultados_por_nivel
    )

    return jsonify(resultado)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Uso:**

```bash
curl -X POST http://localhost:5000/predecir \
  -H "Content-Type: application/json" \
  -d '{
    "estudiante_id": "EST_00012345",
    "cursos": ["CRS_00017889", "CRS_00017890", "CRS_00017891"]
  }'
```

### API REST con FastAPI

```python
# main.py
from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import sys
sys.path.append('./models')
from lada_funciones import predecir_estudiante_api

app = FastAPI()

# Cargar modelo al inicio
with open('./models/lada_modelo.pkl', 'rb') as f:
    modelo = pickle.load(f)

resultados_por_nivel = modelo['resultados_por_nivel']
df_estudiantes = modelo['df_estudiantes']

class PrediccionRequest(BaseModel):
    estudiante_id: str
    cursos: list[str]

@app.post("/predecir")
def predecir(request: PrediccionRequest):
    resultado = predecir_estudiante_api(
        request.estudiante_id,
        request.cursos,
        df_estudiantes,
        resultados_por_nivel
    )
    return resultado

# Ejecutar con: uvicorn main:app --reload
```

### Integración en Aplicación Web (JavaScript)

```javascript
// frontend.js
async function predecirExito(estudianteId, cursos) {
    const response = await fetch('http://localhost:5000/predecir', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            estudiante_id: estudianteId,
            cursos: cursos
        })
    });

    const resultado = await response.json();

    // Mostrar resultado
    console.log(`Probabilidad: ${resultado.probabilidad_exito * 100}%`);
    console.log(`Confianza: ${resultado.confianza}`);

    return resultado;
}

// Uso
predecirExito('EST_00012345', ['CRS_00017889', 'CRS_00017890'])
    .then(res => {
        document.getElementById('probabilidad').textContent =
            `${(res.probabilidad_exito * 100).toFixed(1)}%`;
        document.getElementById('confianza').textContent = res.confianza;
    });
```

## Componentes del Modelo

### `resultados_por_nivel`
Diccionario con 3 niveles jerárquicos:

```python
{
    'NIVEL_1': {
        'firma': {
            'n_clusters': int,
            'total_casos': int,
            'tasas_exito': {cluster_id: tasa},
            'tamanos': {cluster_id: num_estudiantes}
        }
    },
    'NIVEL_2': {...},
    'NIVEL_3': {...}
}
```

### `df_estudiantes`
DataFrame con columnas:
- `CODIGO_ESTUDIANTE`: ID del estudiante
- `PGA`: Promedio General Acumulado (GPA)

### `metadata`
Información del modelo:

```python
{
    'version': '1.0',
    'fecha_entrenamiento': '2024-XX-XX',
    'periodo_train_end': 202010,
    'periodo_val_end': 202310,
    'metricas': {
        'mae': 0.0653,
        'rmse': 0.0912,
        'accuracy_10': 0.7143,
        'accuracy_20': 0.9286,
        'correlacion': 0.7456
    }
}
```

## Interpretación de Resultados

### Nivel de Confianza

- **ALTA**: ≥50 estudiantes similares en datos históricos
- **MEDIA**: 20-49 estudiantes similares
- **BAJA**: <20 estudiantes similares

**Recomendación:** Predicciones con confianza ALTA son más confiables. Para confianza BAJA, considere revisar manualmente o solicitar más información.

### Niveles Jerárquicos

- **NIVEL_3** (Óptimo): Combinación exacta de cursos encontrada en histórico
- **NIVEL_2** (Bueno): Categorías de cursos similares encontradas
- **NIVEL_1** (Fallback): Basado solo en cantidad de cursos

**Recomendación:** NIVEL_3 proporciona las predicciones más precisas. NIVEL_1 es más general pero sigue siendo útil.

### Casos Especiales

#### Estudiante Nuevo
Si el estudiante no existe en `df_estudiantes`:
- Se asigna al cluster con mejor tasa de éxito
- Confianza puede ser menor
- Resultado: predicción optimista pero confiable

#### Combinación de Cursos sin Datos
Si no hay datos históricos para la combinación:
- Se usa probabilidad base: 93.77% (tasa global de éxito)
- `cluster_id`: None
- `confianza`: 'BAJA'
- `mensaje`: 'No hay datos históricos suficientes...'

## Mantenimiento y Actualización

### Re-entrenar el Modelo

1. Ejecutar notebook principal: `LADA_sistema_recomendacion_multinivel.ipynb`
2. Actualizar datos con nuevos períodos
3. Ejecutar todas las celdas
4. Ejecutar celda de exportación (Sección 14)
5. Verificar nuevo archivo `lada_modelo.pkl`

### Actualizar Datos de Estudiantes

```python
# Actualizar PGA de estudiantes existentes
import pickle

with open('./models/lada_modelo.pkl', 'rb') as f:
    modelo = pickle.load(f)

# Actualizar df_estudiantes con nuevos datos
# ... (cargar nuevos datos)

modelo['df_estudiantes'] = df_estudiantes_actualizado

# Guardar modelo actualizado
with open('./models/lada_modelo.pkl', 'wb') as f:
    pickle.dump(modelo, f)
```

### Versionado del Modelo

Recomendación: Mantener versiones del modelo para rollback

```bash
models/
├── lada_modelo_v1.0.pkl
├── lada_modelo_v1.1.pkl
└── lada_modelo.pkl  # Symlink o copia de la versión actual
```

## Performance

### Latencia
- Predicción individual: ~10-50ms
- Batch de 100 estudiantes: ~1-2 segundos

### Tamaño del Modelo
- Archivo `.pkl`: ~5-50 MB (depende del tamaño de datos)
- Carga en memoria: ~50-200 MB

### Optimización
Para aplicaciones de alta concurrencia:
1. Cargar modelo una sola vez al inicio
2. Compartir instancia entre requests (thread-safe)
3. Considerar cacheo de resultados frecuentes
4. Usar servidor ASGI (uvicorn, gunicorn) para mejor performance

## Troubleshooting

### Error: "KeyError: firma not found"
**Causa:** Combinación de cursos no existe en ningún nivel
**Solución:** El sistema automáticamente usa NIVEL_1 como fallback

### Error: "FileNotFoundError: lada_modelo.pkl"
**Causa:** Modelo no ha sido generado o ruta incorrecta
**Solución:**
1. Ejecutar notebook de entrenamiento
2. Verificar ruta al archivo .pkl

### Predicción retorna confianza BAJA constantemente
**Causa:** Pocos datos históricos para las combinaciones consultadas
**Solución:**
1. Re-entrenar con más datos
2. Ajustar umbrales de min_casos en `seleccionar_nivel_adaptativo()`

### Warnings de pandas/numpy
**Causa:** Versiones de librerías
**Solución:** Actualizar dependencias:
```bash
pip install --upgrade pandas numpy scikit-learn
```

## Soporte Técnico

Para consultas o problemas:
1. Revisar notebook de ejemplo: `LADA_carga_modelo.ipynb`
2. Verificar documentación de funciones en `lada_funciones.py`
3. Consultar metadata del modelo para métricas de calidad

## Licencia y Créditos

Sistema LADA - Learning Analytics Dashboard for Academic Advising
Clustering Multinivel con Fuzzy C-means

## Changelog

### Versión 1.0 (Inicial)
- Sistema de clustering multinivel (3 niveles)
- Selección adaptativa de nivel jerárquico
- Funciones API-ready para integración
- Exportación/carga de modelo
- Métricas de evaluación integradas
