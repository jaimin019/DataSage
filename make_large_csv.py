import pandas as pd
import numpy as np

# Create 60k rows with numeric columns to test clustering and anomaly detection
n_rows = 60000
df = pd.DataFrame({
    'id': np.arange(n_rows),
    'val1': np.random.randn(n_rows),
    'val2': np.random.rand(n_rows) * 100,
    'val3': np.random.randint(0, 50, n_rows),
    'category': np.random.choice(['A', 'B', 'C', 'D'], n_rows)
})
df.to_csv("large_test.csv", index=False)
