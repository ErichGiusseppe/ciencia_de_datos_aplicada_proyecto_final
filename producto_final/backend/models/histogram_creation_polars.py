import polars as pl
import numpy as np
from scipy.interpolate import interp1d
import matplotlib.pyplot as plt
import os

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

    current_dir = os.path.dirname(os.path.abspath(__file__))
    parquet_file_historial = os.path.join(current_dir, 'historial_rendimiento_academico_estudiante_anonymized.parquet')
    parquet_file_informacion = os.path.join(current_dir, 'informacion_actual_estudiante_anonymized.parquet')
    # Read the Parquet files using Polars
    df_historial = pl.read_parquet(parquet_file_historial)
    df_actual = pl.read_parquet(parquet_file_informacion)

    # Create a DataFrame from the input list
    df_input = pl.DataFrame({
        'CODIGO_ESTUDIANTE': [x[0] for x in info_from_cluster],
        'PERIODO': [x[1] for x in info_from_cluster]
    })

    # Join with historial to get all metrics at once
    df_joined = df_input.join(
        df_historial.select(['CODIGO_ESTUDIANTE', 'PERIODO', 'TOTAL_SEMESTRES_MATRICULADOS', 
                            'PORCENTAJE_CREDITOS_APROBADOS', 'PGA']),
        on=['CODIGO_ESTUDIANTE', 'PERIODO'],
        how='left'
    )

    # Extract lists (filtering out nulls)
    total_semestres_list = df_joined.filter(
        pl.col('TOTAL_SEMESTRES_MATRICULADOS').is_not_null()
    )['TOTAL_SEMESTRES_MATRICULADOS'].to_list()

    porcentaje_creditos_list = df_joined.filter(
        pl.col('PORCENTAJE_CREDITOS_APROBADOS').is_not_null()
    )['PORCENTAJE_CREDITOS_APROBADOS'].to_list()

    # For PGA, get valid values first
    pga_valid = df_joined.filter(
        (pl.col('PGA').is_not_null()) & (pl.col('PGA') > 0)
    )['PGA'].to_list()

    # For missing PGA values, calculate from ICFES
    df_missing_pga = df_joined.filter(
        (pl.col('PGA').is_null()) | (pl.col('PGA') == 0)
    ).select(['CODIGO_ESTUDIANTE', 'PERIODO'])

    if len(df_missing_pga) > 0:
        df_icfes = df_missing_pga.join(
            df_actual.select(['CODIGO_ESTUDIANTE', 'PERIODO', 'PUNTAJE_ICFES']),
            on=['CODIGO_ESTUDIANTE', 'PERIODO'],
            how='left'
        ).filter(
            pl.col('PUNTAJE_ICFES').is_not_null()
        ).with_columns(
            ((pl.col('PUNTAJE_ICFES').cast(pl.Float64) / 500.0) * 5.0).alias('pga_from_icfes')
        )
        
        pga_from_icfes = df_icfes['pga_from_icfes'].to_list()
        pga_list = pga_valid + pga_from_icfes
    else:
        pga_list = pga_valid

    # Function to create 200-point distribution from data
    def create_distribution(data_list, n_points=200):
        if len(data_list) == 0:
            return [0] * n_points, [], []
        
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
            return y_new.tolist(), bin_centers, hist
        else:
            # If only one bin, return uniform distribution
            return ([hist[0]] * n_points if len(hist) > 0 else [0] * n_points), bin_centers, hist

    # Create distributions for each metric and visualize
    gpa_distribution, gpa_bin_centers, gpa_hist = create_distribution(pga_list)
    semesters_distribution, sem_bin_centers, sem_hist = create_distribution(total_semestres_list)
    credits_distribution, cred_bin_centers, cred_hist = create_distribution(porcentaje_creditos_list)

    '''# Create comparison visualizations
    fig, axes = plt.subplots(3, 2, figsize=(15, 12))
    
    # GPA - Original vs Interpolated
    if len(gpa_bin_centers) > 0:
        axes[0, 0].bar(gpa_bin_centers, gpa_hist, width=np.diff(gpa_bin_centers).mean() if len(gpa_bin_centers) > 1 else 1, 
                       alpha=0.7, color='blue', edgecolor='black')
        axes[0, 0].set_title('GPA - Original Histogram', fontweight='bold')
        axes[0, 0].set_xlabel('GPA Value')
        axes[0, 0].set_ylabel('Density')
        axes[0, 0].grid(True, alpha=0.3)
    
    axes[0, 1].plot(np.linspace(min(pga_list) if pga_list else 0, max(pga_list) if pga_list else 1, 200), 
                    gpa_distribution, color='blue', linewidth=2)
    axes[0, 1].set_title('GPA - Interpolated (200 points)', fontweight='bold')
    axes[0, 1].set_xlabel('GPA Value')
    axes[0, 1].set_ylabel('Density')
    axes[0, 1].grid(True, alpha=0.3)
    
    # Total Semesters - Original vs Interpolated
    if len(sem_bin_centers) > 0:
        axes[1, 0].bar(sem_bin_centers, sem_hist, width=np.diff(sem_bin_centers).mean() if len(sem_bin_centers) > 1 else 1,
                       alpha=0.7, color='green', edgecolor='black')
        axes[1, 0].set_title('Total Semesters - Original Histogram', fontweight='bold')
        axes[1, 0].set_xlabel('Semesters')
        axes[1, 0].set_ylabel('Density')
        axes[1, 0].grid(True, alpha=0.3)
    
    axes[1, 1].plot(np.linspace(min(total_semestres_list) if total_semestres_list else 0, 
                                max(total_semestres_list) if total_semestres_list else 1, 200),
                    semesters_distribution, color='green', linewidth=2)
    axes[1, 1].set_title('Total Semesters - Interpolated (200 points)', fontweight='bold')
    axes[1, 1].set_xlabel('Semesters')
    axes[1, 1].set_ylabel('Density')
    axes[1, 1].grid(True, alpha=0.3)
    
    # Percentage Credits - Original vs Interpolated
    if len(cred_bin_centers) > 0:
        axes[2, 0].bar(cred_bin_centers, cred_hist, width=np.diff(cred_bin_centers).mean() if len(cred_bin_centers) > 1 else 1,
                       alpha=0.7, color='red', edgecolor='black')
        axes[2, 0].set_title('Credits Approved % - Original Histogram', fontweight='bold')
        axes[2, 0].set_xlabel('Percentage')
        axes[2, 0].set_ylabel('Density')
        axes[2, 0].grid(True, alpha=0.3)
    
    axes[2, 1].plot(np.linspace(min(porcentaje_creditos_list) if porcentaje_creditos_list else 0,
                                max(porcentaje_creditos_list) if porcentaje_creditos_list else 1, 200),
                    credits_distribution, color='red', linewidth=2)
    axes[2, 1].set_title('Credits Approved % - Interpolated (200 points)', fontweight='bold')
    axes[2, 1].set_xlabel('Percentage')
    axes[2, 1].set_ylabel('Density')
    axes[2, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('original_vs_interpolated_comparison.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("\nComparison graph saved as 'original_vs_interpolated_comparison.png'")'''

    return {
        'gpa_histogram': gpa_distribution,
        'total_semesters_histogram': semesters_distribution,
        'percentage_credits_histogram': credits_distribution,
        'gpa_range': {'min': min(pga_list) if pga_list else 0, 'max': max(pga_list) if pga_list else 5},
        'semesters_range': {'min': min(total_semestres_list) if total_semestres_list else 0, 'max': max(total_semestres_list) if total_semestres_list else 20},
        'credits_range': {'min': min(porcentaje_creditos_list) if porcentaje_creditos_list else 0, 'max': max(porcentaje_creditos_list) if porcentaje_creditos_list else 100}
    }