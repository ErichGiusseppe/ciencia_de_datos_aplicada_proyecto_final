import pandas as pd
import json

# Using pyarrow engine
df_pyarrow = pd.read_parquet('historial_materias_estudiante_anonymized.parquet', engine='pyarrow')

# Create a dictionary with unique CODIGO_CURSO as keys and NUMERO_CREDITOS as values
# drop_duplicates keeps the first occurrence of each CODIGO_CURSO
curso_creditos = df_pyarrow[['CODIGO_CURSO', 'NUMERO_CREDITOS']].drop_duplicates(subset='CODIGO_CURSO')
curso_creditos_dict = dict(zip(curso_creditos['CODIGO_CURSO'], curso_creditos['NUMERO_CREDITOS']))

# Save to JSON file
with open('curso_creditos.json', 'w', encoding='utf-8') as f:
    json.dump(curso_creditos_dict, f, indent=2, ensure_ascii=False)

print(f"Created JSON with {len(curso_creditos_dict)} unique courses")