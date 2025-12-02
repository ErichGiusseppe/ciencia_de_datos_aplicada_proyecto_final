# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import sys
sys.path.append('./models')
from lada_funciones import predecir_probabilidad_exito
from histogram_creation_polars import create_histogram

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins; for production, specify allowed origins like ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar modelo al inicio
with open('./models/lada_modelo_v4.pkl', 'rb') as f:
    modelo = pickle.load(f)

resultados_por_nivel = modelo['resultados_por_nivel']
df_estudiantes = modelo['df_estudiantes']
df_train = modelo['df_train']
df_facultades_departamentos = modelo['df_facultades_departamentos']
usar_departamento_nivel2 = modelo['usar_departamento_nivel2']

class PrediccionRequest(BaseModel):
    estudiante_id: str
    cursos: list[str]
    creditos: int
    pga_anterior: float
    semestres_anteriores: int
    pct_creditos_anterior: float

@app.get("/consultar_estudiante/{estudiante_id}")
def consultar_estudiante_endpoint(estudiante_id: str):
    from consultar_estudiante import consultar_estudiante
    resultado = consultar_estudiante(estudiante_id)
    return resultado

@app.post("/predecir")
def predecir(request: PrediccionRequest):
    perfil = {
        'estudiante_id': request.estudiante_id,
        'cursos': request.cursos,
        'num_cursos': len(request.cursos),
        'creditos': request.creditos,
        'pga_anterior': request.pga_anterior,
        'semestres_anteriores': request.semestres_anteriores,
        'pct_creditos_anterior': request.pct_creditos_anterior
    }

    resultado = predecir_probabilidad_exito(
        perfil,
        df_train,
        resultados_por_nivel,
        df_facultades_departamentos,
        usar_departamento_nivel2
    )

    if 'estudiantes_similares' in resultado and resultado['estudiantes_similares']:
        resultado['estudiantes_similares'] = [
            (str(est_id), int(periodo))
            for est_id, periodo in resultado['estudiantes_similares']
        ]

    info_from_cluster = resultado.get('estudiantes_similares', [])
    # Create histogram based on info_from_cluster
    histogram = create_histogram(info_from_cluster, student_id=request.estudiante_id)
    resultado['histogram_gpa'] = histogram['gpa_histogram']
    resultado['histogram_total_semesters'] = histogram['total_semesters_histogram']
    resultado['histogram_percentage_credits'] = histogram['percentage_credits_histogram']
    resultado['gpa_range'] = histogram['gpa_range']
    resultado['semesters_range'] = histogram['semesters_range']
    resultado['credits_range'] = histogram['credits_range']
    resultado['student_gpa'] = histogram['student_gpa']
    resultado['student_total_semesters'] = histogram['student_total_semesters']
    resultado['student_percentage_credits'] = histogram['student_percentage_credits']
    
    
    return resultado