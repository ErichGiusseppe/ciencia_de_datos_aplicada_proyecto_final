"""
Funciones del Sistema LADA
Recomendaciones Academicas con Clustering Multinivel
"""

import pandas as pd
import numpy as np


def extraer_categoria_curso(codigo_curso):
    """
    Extrae la categoria tematica del codigo del curso.
    Ejemplo: 'CRS_00017889' -> 'CAT_000'
    """
    if pd.isna(codigo_curso):
        return 'DESCONOCIDO'

    codigo_str = str(codigo_curso)
    partes = codigo_str.split('_')
    if len(partes) > 1:
        numero = partes[1]
        if len(numero) >= 5:
            return f"CAT_{numero[:3]}"

    return 'DESCONOCIDO'


def seleccionar_nivel_adaptativo(estudiante_perfil, df_inscripciones, resultados_por_nivel):
    """
    Selecciona el nivel jerarquico mas apropiado para un estudiante.

    Intenta usar el nivel mas especifico posible:
    - NIVEL_3: Cursos exactos (requiere >=20 casos)
    - NIVEL_2: Categorias de cursos (requiere >=10 casos)
    - NIVEL_1: Numero de cursos (requiere >=5 casos)
    """
    cursos_estudiante = estudiante_perfil.get('cursos', [])
    num_cursos = len(cursos_estudiante)

    firma_nivel_1 = str(num_cursos)

    categorias = [extraer_categoria_curso(c) for c in cursos_estudiante]
    contador = pd.Series(categorias).value_counts().to_dict()
    firma_nivel_2 = '_'.join([f"{cat}:{count}" for cat, count in sorted(contador.items())])

    cursos_ordenados = sorted([str(c) for c in cursos_estudiante])
    firma_nivel_3 = '_'.join(cursos_ordenados)

    niveles_intentar = [
        ('NIVEL_3', firma_nivel_3, 20),
        ('NIVEL_2', firma_nivel_2, 10),
        ('NIVEL_1', firma_nivel_1, 5)
    ]

    for nivel_nombre, firma, min_casos in niveles_intentar:
        if firma in resultados_por_nivel[nivel_nombre]:
            info_cluster = resultados_por_nivel[nivel_nombre][firma]
            total_casos = info_cluster['total_casos']

            if total_casos >= min_casos:
                razon = f"Estudiante MAINSTREAM: {total_casos} casos similares en {nivel_nombre}"
                return nivel_nombre, razon, info_cluster

    razon = "Estudiante OUTLIER: usando nivel menos especifico (NIVEL_1)"
    info_cluster = resultados_por_nivel.get('NIVEL_1', {}).get(firma_nivel_1, None)
    return 'NIVEL_1', razon, info_cluster


def predecir_probabilidad_exito(estudiante_perfil, df_inscripciones, df_estudiantes, resultados_por_nivel):
    """
    Predice la probabilidad de exito para un estudiante dado su perfil.

    Pasos:
    1. Selecciona el nivel jerarquico apropiado
    2. Encuentra el cluster mas similar segun el PGA del estudiante
    3. Retorna la probabilidad de exito del cluster
    """
    nivel, razon, info_cluster = seleccionar_nivel_adaptativo(
        estudiante_perfil, df_inscripciones, resultados_por_nivel
    )

    if info_cluster is None:
        return {
            'nivel_usado': nivel,
            'razon': razon,
            'probabilidad_exito': 0.9377,
            'cluster_id': None,
            'num_estudiantes_similares': 0,
            'confianza': 'BAJA',
            'mensaje': 'No hay datos historicos suficientes'
        }

    estudiante_id = estudiante_perfil['estudiante_id']
    estudiante_data = df_estudiantes[df_estudiantes['CODIGO_ESTUDIANTE'] == estudiante_id]

    if len(estudiante_data) == 0:
        cluster_id = max(info_cluster['tasas_exito'], key=info_cluster['tasas_exito'].get)
    else:
        pga = estudiante_data['PGA'].values[0]
        tasas_ordenadas = sorted(info_cluster['tasas_exito'].items(), key=lambda x: x[1])

        if pga >= 3.5:
            cluster_id = tasas_ordenadas[-1][0]
        elif pga >= 3.0:
            cluster_id = tasas_ordenadas[len(tasas_ordenadas)//2][0]
        else:
            cluster_id = tasas_ordenadas[0][0]

    probabilidad = info_cluster['tasas_exito'][cluster_id]
    num_similares = info_cluster['tamanos'][cluster_id]

    if num_similares >= 50:
        confianza = 'ALTA'
    elif num_similares >= 20:
        confianza = 'MEDIA'
    else:
        confianza = 'BAJA'

    return {
        'nivel_usado': nivel,
        'razon': razon,
        'probabilidad_exito': probabilidad,
        'cluster_id': cluster_id,
        'num_estudiantes_similares': num_similares,
        'confianza': confianza,
        'total_clusters': info_cluster['n_clusters']
    }


def predecir_estudiante_api(estudiante_id, lista_cursos, df_estudiantes, resultados_por_nivel):
    """Funcion simplificada para APIs."""
    perfil = {
        'estudiante_id': estudiante_id,
        'cursos': lista_cursos,
        'num_cursos': len(lista_cursos),
        'creditos': len(lista_cursos) * 3
    }

    resultado = predecir_probabilidad_exito(
        perfil, None, df_estudiantes, resultados_por_nivel
    )

    resultado['estudiante_id'] = estudiante_id
    resultado['num_cursos'] = len(lista_cursos)
    resultado['cursos'] = lista_cursos

    return resultado
