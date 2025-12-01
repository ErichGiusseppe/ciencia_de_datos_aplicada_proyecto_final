import pandas as pd
import numpy as np
from scipy.interpolate import interp1d

def create_histogram(info_from_cluster: list): 
    """
    Given a list of tuples (student_id, current_period), create multiple histogram of current_period values.

    We want 3 different histograms:
    - Histogram of GPA of current period. 
      To find the GPA of each student, we will use the student_id and current period to look up the GPA in the historial_rendimiento_academico_anonimizado.parquet
      If the GPA is not found, we will try to find the ICFES score for that student in the same period in informacion_actual_estudiante_anonimizado.parquet
      The GPA equivalent of the ICFES score will be used to fill in the missing GPA values. That is GPA = (ICFES / 500) * 5.0
    - Histogram of TOTAL_SEMESTRES_MATRICULADOS in the current period.
    - Histogram of PORCENTAJE_CREDITOS_APROBADOS in the current period.

    We will not actually return the histograms, but rather the data needed to plot them. That data must be 200 bins for each histogram using interpolation or extrapolation as needed.
    
    Returns a dictionary with keys 'gpa_histogram', 'total_semesters_histogram', 'percentage_credits_histogram', each containing a list of 200 values representing the histogram data.
    """

    parquet_file_historial = 'historial_rendimiento_academico_estudiante_anonymized.parquet'
    parquet_file_informacion = 'informacion_actual_estudiante_anonymized.parquet'

    # Read the Parquet file into a Pandas DataFrame
    df_historial = pd.read_parquet(parquet_file_historial)
    df_actual = pd.read_parquet(parquet_file_informacion)

    # Initialize lists
    total_semestres_list = []
    porcentaje_creditos_list = []
    pga_list = []

    # Process each (student_id, period) tuple
    i = 0
    for codigo_estudiante, periodo in info_from_cluster:
        i += 1
        if i % 500 == 0:
            print(f"Processing student {i}/{len(info_from_cluster)}")
        # Filter for specific student and period
        historial_row = df_historial[(df_historial['CODIGO_ESTUDIANTE'] == codigo_estudiante) & 
                                      (df_historial['PERIODO'] == periodo)]
        
        # 1. Extract TOTAL_SEMESTRES_MATRICULADOS
        if not historial_row.empty:
            total_sem = historial_row['TOTAL_SEMESTRES_MATRICULADOS'].values[0]
            if pd.notna(total_sem):
                total_semestres_list.append(total_sem)
        
        # 2. Extract PORCENTAJE_CREDITOS_APROBADOS
        if not historial_row.empty:
            porc_cred = historial_row['PORCENTAJE_CREDITOS_APROBADOS'].values[0]
            if pd.notna(porc_cred):
                porcentaje_creditos_list.append(porc_cred)
        
        # 3. Extract PGA or calculate from ICFES
        if not historial_row.empty:
            pga = historial_row['PGA'].values[0]
            if pd.notna(pga) and pga > 0:
                pga_list.append(pga)
            else:
                # Try to find ICFES score
                actual_row = df_actual[(df_actual['CODIGO_ESTUDIANTE'] == codigo_estudiante) & 
                                       (df_actual['PERIODO'] == periodo)]
                if not actual_row.empty:
                    icfes = actual_row['PUNTAJE_ICFES'].values[0]
                    if pd.notna(icfes):
                        pga_equivalent = (float(icfes) / 500) * 5.0
                        pga_list.append(pga_equivalent)

    # Function to create 200-point distribution from data
    def create_distribution(data_list, n_points=200):
        if len(data_list) == 0:
            return [0] * n_points
        
        # Create histogram with automatic binning
        hist, bin_edges = np.histogram(data_list, bins=min(len(data_list), 50), density=True)
        
        # Get bin centers
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
        
        # Create interpolation function
        if len(bin_centers) > 1:
            f = interp1d(bin_centers, hist, kind='linear', fill_value='extrapolate')
            # Create 200 evenly spaced points across the data range
            x_new = np.linspace(min(data_list), max(data_list), n_points)
            y_new = f(x_new)
            # Ensure non-negative values
            y_new = np.maximum(y_new, 0)
            return y_new.tolist()
        else:
            # If only one bin, return uniform distribution
            return [hist[0]] * n_points if len(hist) > 0 else [0] * n_points

    # Create distributions for each metric
    gpa_distribution = create_distribution(pga_list)
    semesters_distribution = create_distribution(total_semestres_list)
    credits_distribution = create_distribution(porcentaje_creditos_list)

    return {
        'gpa_histogram': gpa_distribution,
        'total_semesters_histogram': semesters_distribution,
        'percentage_credits_histogram': credits_distribution
    }