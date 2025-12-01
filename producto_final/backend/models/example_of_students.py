import pandas as pd
import random
from histogram_creation_polars import create_histogram
import matplotlib.pyplot as plt

def get_random_students(n_samples=6000):
    """
    Get a random sample of students from the historial_rendimiento_academico.parquet file.
    
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
    
    # Sample randomly
    if len(df_unique) >= n_samples:
        df_sample = df_unique.sample(n=n_samples)
    else:
        # If we don't have enough unique combinations, take all available
        df_sample = df_unique
    
    # Convert to list of tuples
    student_list = list(df_sample.itertuples(index=False, name=None))
    
    return student_list

# Example usage
if __name__ == "__main__":
    random_students = get_random_students(6000)
    print(f"Total students sampled: {len(random_students)}")
    print(f"First 5 samples: {random_students[:5]}")

    # Get histogram data
    histogram_data = create_histogram(random_students)
    print("Histogram data keys:", histogram_data.keys())
    
    # Create 3 separate graphs
    '''fig, axes = plt.subplots(3, 1, figsize=(10, 12))
    
    # Plot GPA distribution
    axes[0].plot(histogram_data['gpa_histogram'], color='blue', linewidth=2)
    axes[0].set_title('GPA Distribution', fontsize=14, fontweight='bold')
    axes[0].set_xlabel('Bin Index')
    axes[0].set_ylabel('Density')
    axes[0].grid(True, alpha=0.3)
    
    # Plot Total Semesters distribution
    axes[1].plot(histogram_data['total_semesters_histogram'], color='green', linewidth=2)
    axes[1].set_title('Total Semesters Enrolled Distribution', fontsize=14, fontweight='bold')
    axes[1].set_xlabel('Bin Index')
    axes[1].set_ylabel('Density')
    axes[1].grid(True, alpha=0.3)
    
    # Plot Percentage Credits distribution
    axes[2].plot(histogram_data['percentage_credits_histogram'], color='red', linewidth=2)
    axes[2].set_title('Percentage of Credits Approved Distribution', fontsize=14, fontweight='bold')
    axes[2].set_xlabel('Bin Index')
    axes[2].set_ylabel('Density')
    axes[2].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('student_distributions_2.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("\nGraphs saved as 'student_distributions_2.png'")'''