import pandas as pd
import random
from histogram_creation_polars import create_histogram

def get_random_students(n_samples=6000):
    """
    Get the first n_samples students from the historial_rendimiento_academico.parquet file.
    
    Returns:
        list: A list of tuples (CODIGO_ESTUDIANTE, PERIODO)
    """
    parquet_file = 'historial_rendimiento_academico_estudiante_anonymized.parquet'
    
    # Read the Parquet file
    df = pd.read_parquet(parquet_file)
    
    # Select only the columns we need
    df_subset = df[['CODIGO_ESTUDIANTE', 'PERIODO']].copy()
    
    # Remove duplicates to get unique student-period combinations
    df_unique = df_subset.drop_duplicates()
    
    # Take the first n_samples
    df_sample = df_unique.head(n_samples)
    
    # Convert to list of tuples
    student_list = list(df_sample.itertuples(index=False, name=None))
    
    return student_list

# Example usage
if __name__ == "__main__":
    random_students = get_random_students(6000)
    print(f"Total students sampled: {len(random_students)}")
    print(f"First 5 samples: {random_students[:5]}")

    print(create_histogram(random_students))