import pandas as pd
from sqlalchemy import create_engine, text
import numpy as np
import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv('../backend/api/.env')

# -----------------------------
# DATABASE CONNECTION
# -----------------------------

user = os.getenv("DB_USER")
password = os.getenv("DB_PASSWORD")
database = os.getenv("DB_NAME")
host = os.getenv("DB_HOST")
port = os.getenv("DB_PORT")

safe_password = urllib.parse.quote_plus(password)

engine = create_engine(
    f"mysql+mysqlconnector://{user}:{safe_password}@{host}:{port}/{database}"
)

try:
    with engine.connect() as conn:
        print("Database connection established successfully!")
except Exception as e:
    print("Database connection failed:", e)
    exit()

# -----------------------------
# LOADING THE DATA
# -----------------------------

trips_df = pd.read_csv("yellow_tripdata_2019-01.csv")
print(f"Loaded {len(trips_df)} rows")

# -----------------------------
# CLEANING THE TRIPS DATA
# -----------------------------

trips_df["tpep_pickup_datetime"] = pd.to_datetime(
    trips_df["tpep_pickup_datetime"], errors="coerce"
)
trips_df["tpep_dropoff_datetime"] = pd.to_datetime(
    trips_df["tpep_dropoff_datetime"], errors="coerce"
)

trips_df = trips_df[
    (trips_df["trip_distance"] > 0) &
    (trips_df["fare_amount"] > 0)
]

text_columns = ["store_and_fwd_flag"]
trips_df[text_columns] = trips_df[text_columns].fillna("Unknown")

numeric_columns = [
    "fare_amount", "extra", "mta_tax", "tip_amount", "tolls_amount",
    "improvement_surcharge", "total_amount", "congestion_surcharge", "trip_distance"
]

for col in numeric_columns:
    trips_df[col] = pd.to_numeric(trips_df[col], errors="coerce")

trips_df = trips_df.where(pd.notnull(trips_df), None)

# Drop rows where VendorID is null
trips_df = trips_df.dropna(subset=["VendorID"])
trips_df["VendorID"] = trips_df["VendorID"].astype(int)

print(f"After cleaning: {len(trips_df)} rows")

# -----------------------------
# SEED VENDORS TABLE
# -----------------------------

vendor_map = {
    1: "Creative Mobile Technologies, LLC",
    2: "VeriFone Inc."
}

unique_vendor_ids = sorted(trips_df["VendorID"].unique().tolist())

vendors_df = pd.DataFrame([
    {
        "VendorID": vid,
        "vendor_name": vendor_map.get(vid, f"Unknown Vendor {vid}")
    }
    for vid in unique_vendor_ids
])

print(f"Upserting {len(vendors_df)} vendors: {unique_vendor_ids}")

with engine.connect() as conn:
    for _, row in vendors_df.iterrows():
        conn.execute(text(
            "INSERT IGNORE INTO vendors (VendorID, vendor_name) VALUES (:vid, :name)"
        ), {"vid": int(row["VendorID"]), "name": row["vendor_name"]})
    conn.commit()

print("Vendors seeded successfully!")

# -----------------------------
# SEED LOCATIONS TABLE
# -----------------------------

zones_df = pd.read_csv("taxi_zone_lookup.csv")

# Rename columns to match your DB table columns
zones_df = zones_df.rename(columns={
    "LocationID": "LocationID",
    "Borough":    "Borough",
    "Zone":       "Zone",
    "service_zone": "service_zone"
})

# Clean: fill any nulls in text fields
zones_df["Borough"]      = zones_df["Borough"].fillna("Unknown")
zones_df["Zone"]         = zones_df["Zone"].fillna("Unknown")
zones_df["service_zone"] = zones_df["service_zone"].fillna("Unknown")
zones_df["LocationID"]   = zones_df["LocationID"].astype(int)

print(f"Upserting {len(zones_df)} locations...")

with engine.connect() as conn:
    for _, row in zones_df.iterrows():
        conn.execute(text("""
            INSERT IGNORE INTO locations (LocationID, Borough, Zone, service_zone)
            VALUES (:lid, :borough, :zone, :service_zone)
        """), {
            "lid":          int(row["LocationID"]),
            "borough":      row["Borough"],
            "zone":         row["Zone"],
            "service_zone": row["service_zone"]
        })
    conn.commit()

print("Locations seeded successfully!")

# -----------------------------
# LOAD TRIPS TO DATABASE
# -----------------------------

# Safety filter: only insert trips whose LocationIDs exist in the locations table
valid_location_ids = zones_df["LocationID"].tolist()
valid_vendor_ids   = vendors_df["VendorID"].tolist()

before = len(trips_df)
trips_df = trips_df[
    trips_df["VendorID"].isin(valid_vendor_ids) &
    trips_df["PULocationID"].isin(valid_location_ids) &
    trips_df["DOLocationID"].isin(valid_location_ids)
]
print(f"Trips after FK safety filter: {len(trips_df)} (dropped {before - len(trips_df)})")

trips_df.to_sql(
    name="trips",
    con=engine,
    if_exists="append",
    index=False,
    chunksize=5000
)

print("Data successfully inserted into database!")