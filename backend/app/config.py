# This file is for DB configration, and manages credentials

import os
from dotenv import load_dotenv 

class config: 
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_NAME")
    DB_NAME = os.getenv("BD_NAME")

    # Connect to MySQL
    SQLALCHEMY_DATABASE_URI = (
        f"myssql+pymysql://{DB_USER}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATION = False