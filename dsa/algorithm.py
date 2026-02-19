import json
import mysql.connector
import time

# DB connection
con = mysql.connector.connect(
    host="",
    port=,
    user="",
    password="",
    database=""
)
cursor = con.cursor()

print("Connected to database!")

start = time.perf_counter()
cursor.execute("SELECT LocationID, Borough FROM locations")
location_map = {row[0]: row[1] for row in cursor.fetchall()}
end = time.perf_counter()    

print(f"Loaded {len(location_map)} locations into hash map in: {end - start:.2f} seconds")


print("\nBusiest Borough...")
start = time.perf_counter()
cursor.execute("""
    SELECT PULocationID, COUNT(*) as trip_count
    FROM trips
    GROUP BY PULocationID
    ORDER BY trip_count DESC
""")

borough_counts = {}
for row in cursor.fetchall():
    loc_id = row[0]
    count = row[1]
    borough_name = location_map.get(loc_id, "Unknown")
    borough_counts[borough_name] = borough_counts.get(borough_name, 0) + count

top_borough = max(borough_counts, key=borough_counts.get)
problem_1 = {
    "borough": top_borough,
    "trip_count": borough_counts[top_borough]
}
end = time.perf_counter()

print(json.dumps({"busiest_borough": problem_1,"execution_time": round(end - start, 2)}, indent=2))

print("\nFinding Peak Hour...")
start = time.perf_counter()
cursor.execute("""
    SELECT HOUR(tpep_pickup_datetime) as trip_hour, COUNT(*) as trip_count
    FROM trips
    GROUP BY trip_hour
    ORDER BY trip_count DESC
    LIMIT 1
""")

row = cursor.fetchone()
peak_hour_data = {
    "peak_hour": f"{row[0]}:00",
    "trip_count": row[1]
}
end = time.perf_counter()

print(json.dumps({"peak_hour": peak_hour_data,"execution_time": round(end - start, 2)}, indent=2))
cursor.close()
con.close()
