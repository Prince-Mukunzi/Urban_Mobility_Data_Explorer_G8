import mysql.connector
import time
import os
from dotenv import load_dotenv

# DB connection 
con = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT")), 
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    database=os.getenv("DB_NAME")
)
cursor = con.cursor(buffered=False) 


target_zone = 81 

query = "SELECT fare_amount, tpep_pickup_datetime FROM trips WHERE PULocationID = %s"
cursor.execute(query, (target_zone,))
data_subset = cursor.fetchall() 



start_time = time.perf_counter()

hour_map = {}
total_fare_sum = 0.0
trip_count = 0

for fare, dt in data_subset:
    trip_count += 1
    
    total_fare_sum += float(fare)
    
    hour = dt.hour
    if hour in hour_map:
        hour_map[hour] += 1
    else:
        hour_map[hour] = 1

average_fare = total_fare_sum / trip_count if trip_count > 0 else 0

peak_hour = None
max_val = -1
for hour, count in hour_map.items():
    if count > max_val:
        max_val = count
        peak_hour = hour

end_time = time.perf_counter()
print("")
print("==============================")
print(f"Zone id: {target_zone}")
print(f"Total trips: {trip_count}")
print(f"average fare: ${average_fare:.2f}")
print(f"peak Hour: {peak_hour}:00")
print(f"total time: {end_time - start_time:.6f} seconds")
print("==============================")

cursor.close()
con.close()
