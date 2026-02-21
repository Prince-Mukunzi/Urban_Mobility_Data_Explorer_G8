import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import urllib.parse

load_dotenv('/Users/princemukunzi/Documents/ALU/Urban_Mobility_Data_Explorer_G8/backend/api/.env')
user = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
database = os.getenv('DB_NAME')
host = os.getenv('DB_HOST')
port = os.getenv('DB_PORT')

safe_password = urllib.parse.quote_plus(password)
engine = create_engine(f'mysql+pymysql://{user}:{safe_password}@{host}:{port}/{database}')

queries = [
    "CREATE INDEX idx_tpep_pickup_datetime ON trips (tpep_pickup_datetime);",
    "CREATE INDEX idx_PULocationID ON trips (PULocationID);",
    "CREATE INDEX idx_DOLocationID ON trips (DOLocationID);"
]

with engine.connect() as conn:
    for q in queries:
        print(f"Executing: {q}")
        try:
            conn.execute(text(q))
            print("Successfully executed.")
        except Exception as e:
            print(f"Error executing {q}: {e}")
