import json
import geopandas as gpd
import mysql.connector
from shapely.geometry import mapping

print("Connecting to database...")
conn = mysql.connector.connect(
    host="",
    user="",
    password="",
    database="",
    port=""
)
cursor = conn.cursor()
print("Connected to db successfully!")

print("loading the shapefile...")
zones = gpd.read_file("taxi_zones.zip")
zones = zones.to_crs(epsg=4326)
print(f" {len(zones)} zones have been found.")

# cursor.execute("ALTER TABLE locations ADD COLUMN geometry JSON NULL")
# print("Geometry column added!")

print("Updating locations table...")
updated = 0
for index, row in zones.iterrows():
    location_id = int(row["LocationID"])
    geometry = json.dumps(mapping(row["geometry"]))

    query = "UPDATE locations SET geometry = '" + geometry + "' WHERE LocationID = " + str(location_id)
    cursor.execute(query)

    if cursor.rowcount > 0:
        updated += 1
        print(f"updated LocationID {location_id} — {row['zone']}")
    else:
        print(f"location id not found {location_id} — {row['zone']}")

conn.commit()
cursor.close()
conn.close()

print(f"{updated} locations updated")
