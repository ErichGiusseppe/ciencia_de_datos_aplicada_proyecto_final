import pandas as pd
import numpy as np


def extraer_categoria_curso(codigo_curso, df_facultades_departamentos, usar_departamento=False):
    if pd.isna(codigo_curso):
        return 'DESCONOCIDO'

    match = df_facultades_departamentos[
        df_facultades_departamentos['CODIGO_CURSO'] == codigo_curso
    ]

    if len(match) == 0:
        return 'DESCONOCIDO'

    if usar_departamento:
        codigo = match['CODIGO_DEPARTAMENTO'].iloc[0]
        return f"DEPT_{codigo}" if pd.notna(codigo) else 'DESCONOCIDO'
    else:
        codigo = match['CODIGO_FACULTAD'].iloc[0]
        return f"FAC_{codigo}" if pd.notna(codigo) else 'DESCONOCIDO'


def seleccionar_nivel_adaptativo(estudiante_perfil, df_inscripciones,
                                 resultados_por_nivel, df_facultades_departamentos,
                                 usar_departamento=False):
    cursos = estudiante_perfil.get('cursos', [])
    num_cursos = len(cursos)

    firma_nivel_1 = str(num_cursos)

    categorias = [extraer_categoria_curso(c, df_facultades_departamentos, usar_departamento)
                  for c in cursos]
    contador = pd.Series(categorias).value_counts().to_dict()
    firma_nivel_2 = '_'.join([f"{cat}:{count}" for cat, count in sorted(contador.items())])

    cursos_ordenados = sorted([str(c) for c in cursos])
    firma_nivel_3 = '_'.join(cursos_ordenados)

    niveles = [
        ('NIVEL_3', firma_nivel_3, 20),
        ('NIVEL_2', firma_nivel_2, 10),
        ('NIVEL_1', firma_nivel_1, 5)
    ]

    for nivel_nombre, firma, min_casos in niveles:
        clusters = resultados_por_nivel.get(nivel_nombre, {}).get('clusters', {})

        if firma in clusters:
            info_cluster = clusters[firma]
            total_casos = info_cluster['total_casos']

            if total_casos >= min_casos:
                razon = f"Se encontraron {total_casos} casos similares en {nivel_nombre}"
                return nivel_nombre, razon, info_cluster

    razon = "Caso atípico: no hay suficientes datos históricos"
    clusters_nivel1 = resultados_por_nivel.get('NIVEL_1', {}).get('clusters', {})
    info_cluster = clusters_nivel1.get(firma_nivel_1, None)

    return 'NIVEL_1', razon, info_cluster


def predecir_probabilidad_exito(estudiante_perfil, df_inscripciones,
                               resultados_por_nivel, df_facultades_departamentos,
                               usar_departamento=False):
    nivel, razon, info_cluster = seleccionar_nivel_adaptativo(
        estudiante_perfil, df_inscripciones, resultados_por_nivel,
        df_facultades_departamentos, usar_departamento
    )

    if info_cluster is None:
        return {
            "nivel_usado": nivel,
            "razon": razon,
            "probabilidad_exito": None,
            "cluster_id": None,
            "num_estudiantes_similares": 0,
            "confianza": None,
            "mensaje": "No hay datos históricos suficientes para esta combinación de cursos"
        }

    pga_anterior = estudiante_perfil.get("pga_anterior", None)
    semestres_anteriores = estudiante_perfil.get("semestres_anteriores", None)
    pct_creditos_anterior = estudiante_perfil.get("pct_creditos_anterior", None)
    num_cursos = estudiante_perfil.get("num_cursos", None)
    creditos = estudiante_perfil.get("creditos", None)

    if pga_anterior is None or pd.isna(pga_anterior):
        return {
            "nivel_usado": nivel,
            "razon": razon,
            "probabilidad_exito": None,
            "mensaje": "No hay información de PGA anterior para este estudiante"
        }

    features = np.array([
        pga_anterior,
        semestres_anteriores if semestres_anteriores is not None else 0,
        pct_creditos_anterior if pct_creditos_anterior is not None else 100.0,
        num_cursos,
        creditos
    ])

    scaler = info_cluster.get("scaler")
    if scaler is not None:
        features_normalizadas = scaler.transform([features])[0]
    else:
        features_normalizadas = features

    centroides = info_cluster["centroides"]
    distancias = np.linalg.norm(centroides - features_normalizadas, axis=1)

    cluster_id = int(np.argmin(distancias))

    probabilidad = info_cluster["tasas_exito"][cluster_id]
    num_similares = info_cluster["tamanos_cluster"][cluster_id]

    if num_similares >= 50:
        confianza = "ALTA"
    elif num_similares >= 20:
        confianza = "MEDIA"
    else:
        confianza = "BAJA"

    return {
        "nivel_usado": nivel,
        "razon": razon,
        "probabilidad_exito": probabilidad,
        "cluster_id": cluster_id,
        "num_estudiantes_similares": num_similares,
        "confianza": confianza,
        "estudiantes_similares": info_cluster["estudiantes_por_cluster"][cluster_id],
        "algoritmo": info_cluster.get("algoritmo", "fuzzy")
    }
