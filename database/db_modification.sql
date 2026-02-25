-- These are extra queries we ran in order to further clean the database tables


SELECT * FROM trips LIMIT 100;
/* 2026-02-18 00:26:08 [215 ms] */ 
SELECT * FROM locations LIMIT 100;
/* 2026-02-19 17:14:22 [163 ms] */ 
SELECT
    MIN(tpep_pickup_datetime) AS MinDate,
    MAX(tpep_dropoff_datetime) AS MaxDate
FROM
    trips LIMIT 100;
/* 2026-02-19 17:17:48 [1281 ms] */ 
SELECT *
FROM trips
WHERE YEAR(tpep_pickup_datetime) <> 2088 LIMIT 100;
/* 2026-02-19 17:22:38 [29032 ms] */ 
SELECT *
FROM trips
WHERE YEAR(tpep_pickup_datetime) = 2088 LIMIT 100;
/* 2026-02-19 17:27:45 [19079 ms] */ 
DELETE FROM trips
WHERE YEAR(tpep_pickup_datetime) = 2088;
/* 2026-02-19 17:28:48 [218 ms] */ 
SELECT
    MIN(tpep_pickup_datetime) AS MinDate,
    MAX(tpep_dropoff_datetime) AS MaxDate
FROM
    trips LIMIT 100;
/* 2026-02-19 17:31:59 [6896 ms] */ 
SELECT
    MIN(passenger_count) AS min_passengers,
    MAX(passenger_count) AS max_passengers,
    MIN(trip_distance) AS min_distance,
    MAX(trip_distance) AS max_distance,
    MIN(fare_amount) AS min_fare,
    MAX(fare_amount) AS max_fare
FROM
    trips LIMIT 100;
/* 2026-02-19 17:37:01 [222 ms] */ 
SELECT trip_id, passenger_count, trip_distance, fare_amount
FROM trips
WHERE passenger_count = 0
   OR trip_distance < 0
   OR fare_amount < 0 LIMIT 100;
/* 2026-02-19 17:39:48 [4026 ms] */ 
SELECT COUNT(*) AS Zero_passenger_trips
FROM trips
WHERE passenger_count = 0 LIMIT 100;
/* 2026-02-19 17:58:08 [16311 ms] */ 
DELETE FROM trips
WHERE passenger_count = 0 AND trip_distance = 0 AND fare_amount = 0;
/* 2026-02-19 17:59:35 [30915 ms] */ 
DELETE FROM trips
WHERE passenger_count = 0 OR trip_distance = 0 OR fare_amount = 0;
