# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import sys
sys.path.append('./models')
from lada_funciones import predecir_estudiante_api
from histogram_creation_polars import create_histogram
from example_of_students import get_random_students

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins; for production, specify allowed origins like ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar modelo al inicio
with open('./models/lada_modelo.pkl', 'rb') as f:
    modelo = pickle.load(f)

resultados_por_nivel = modelo['resultados_por_nivel']
df_estudiantes = modelo['df_estudiantes']

class PrediccionRequest(BaseModel):
    estudiante_id: str
    cursos: list[str]
    creditos: int

@app.post("/predecir")
def predecir(request: PrediccionRequest):
    resultado = predecir_estudiante_api(
        request.estudiante_id,
        request.cursos,
        request.creditos,
        df_estudiantes,
        resultados_por_nivel
    )

    #info_from_cluster = resultado.get('info_from_cluster', []) #This should be a list of tuples. Each tuple contains (student_id, current_period)
    random_studens = get_random_students(6000)
    info_from_cluster = random_studens
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