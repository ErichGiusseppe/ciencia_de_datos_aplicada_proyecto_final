# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import sys
sys.path.append('./models')
from lada_funciones import predecir_estudiante_api

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
    return resultado