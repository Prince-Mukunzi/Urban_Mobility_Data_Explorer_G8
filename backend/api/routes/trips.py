from flask import Blueprint, jsonify, request
from models import db, Trip, Location
from sqlalchemy.sql import func
from sqlalchemy import extract
from datetime import datetime

trips_bp = Blueprint('trips', __name__)


def apply_trip_filters(query):
    pickup_hour = request.args.get('pickup_hour', type=int)
    if pickup_hour is not None:
        query = query.filter(
            extract('hour', Trip.tpep_pickup_datetime) == pickup_hour
        )

    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    if not date_from and not date_to:
        date_from = '2019-01-01'
        date_to = '2019-01-01'

    if date_from:
        query = query.filter(
            Trip.tpep_pickup_datetime >= datetime.strptime(
                date_from, '%Y-%m-%d')
        )
    if date_to:
        query = query.filter(
            Trip.tpep_pickup_datetime <= datetime.strptime(date_to, '%Y-%m-%d')
        )

    min_pass = request.args.get('min_passengers', type=int)
    max_pass = request.args.get('max_passengers', type=int)
    if min_pass is not None:
        query = query.filter(Trip.passenger_count >= min_pass)
    if max_pass is not None:
        query = query.filter(Trip.passenger_count <= max_pass)

    min_dist = request.args.get('min_distance', type=float)
    max_dist = request.args.get('max_distance', type=float)
    if min_dist is not None:
        query = query.filter(Trip.trip_distance >= min_dist)
    if max_dist is not None:
        query = query.filter(Trip.trip_distance <= max_dist)

    min_fare = request.args.get('min_fare', type=float)
    max_fare = request.args.get('max_fare', type=float)
    if min_fare is not None:
        query = query.filter(Trip.fare_amount >= min_fare)
    if max_fare is not None:
        query = query.filter(Trip.fare_amount <= max_fare)

    return query


def apply_borough_filters(query, pickup_loc, dropoff_loc):
    pickup_borough = request.args.get('pickup_borough')
    if pickup_borough and pickup_borough != 'All':
        query = query.filter(pickup_loc.Borough == pickup_borough)

    dropoff_borough = request.args.get('dropoff_borough')
    if dropoff_borough and dropoff_borough != 'All':
        query = query.filter(dropoff_loc.Borough == dropoff_borough)

    return query


@trips_bp.route('/trips', methods=['GET'])
def get_trips_data():
    page = request.args.get('page', 1, type=int)

    pickup_loc = db.aliased(Location, name='pickup')
    dropoff_loc = db.aliased(Location, name='dropoff')

    query = (
        db.session.query(Trip, pickup_loc, dropoff_loc)
        .join(pickup_loc, Trip.PULocationID == pickup_loc.LocationID)
        .join(dropoff_loc, Trip.DOLocationID == dropoff_loc.LocationID)
    )
    query = apply_trip_filters(query)
    query = apply_borough_filters(query, pickup_loc, dropoff_loc)

    results = query.limit(15).offset((page - 1) * 15).all()

    trips_list = []
    for trip, pu_loc, do_loc in results:
        trips_list.append({
            "no":           trip.trip_id,
            "pickup_time":  str(trip.tpep_pickup_datetime),
            "dropoff_time": str(trip.tpep_dropoff_datetime),
            "pickup_borough":  pu_loc.Borough,
            "dropoff_borough": do_loc.Borough,
            "distance":     float(trip.trip_distance or 0),
            "passengers":   trip.passenger_count,
            "fare":         float(trip.fare_amount or 0),
            "tip":          float(trip.tip_amount or 0),
            "total":        float(trip.total_amount or 0),
        })

    return jsonify({
        "trips": trips_list,
        "page":  page,
    })


@trips_bp.route('/stats', methods=['GET'])
def get_trips_stats():
    loc_map = {
        l.LocationID: l.Borough
        for l in db.session.query(Location.LocationID, Location.Borough).all()
    }

    query = db.session.query(Trip)
    query = apply_trip_filters(query)

    pickup_borough = request.args.get('pickup_borough')
    if pickup_borough and pickup_borough != 'Any':
        ids = [lid for lid, b in loc_map.items() if b == pickup_borough]
        if ids:
            query = query.filter(Trip.PULocationID.in_(ids))
        else:
            query = query.filter(db.text("1=0"))

    dropoff_borough = request.args.get('dropoff_borough')
    if dropoff_borough and dropoff_borough != 'Any':
        ids = [lid for lid, b in loc_map.items() if b == dropoff_borough]
        if ids:
            query = query.filter(Trip.DOLocationID.in_(ids))
        else:
            query = query.filter(db.text("1=0"))

    stats = query.with_entities(
        func.count(),
        func.avg(Trip.fare_amount),
        func.avg(Trip.trip_distance),
        func.avg(Trip.tip_amount / func.nullif(Trip.fare_amount, 0))
    ).first()

    total_trips = stats[0] or 0
    avg_fare = round(float(stats[1] or 0), 2)
    avg_distance = round(float(stats[2] or 0), 1)
    avg_tip_pct = round(float(stats[3] or 0) * 100, 1)

    best_borough = pickup_borough if (
        pickup_borough and pickup_borough != 'Any') else None

    if not best_borough and total_trips > 0:
        boro_counts_query = query.with_entities(
            Trip.PULocationID, func.count()
        ).group_by(Trip.PULocationID).all()

        b_map = {}
        for lid, cnt in boro_counts_query:
            b = loc_map.get(lid, 'Unknown')
            b_map[b] = b_map.get(b, 0) + cnt

        best_borough = max(b_map, key=b_map.get) if b_map else "N/A"
    elif not best_borough:
        best_borough = "N/A"

    peak_hour = "N/A"
    if total_trips > 0:
        ph_res = query.with_entities(
            extract('hour', Trip.tpep_pickup_datetime), func.count()
        ).group_by(
            extract('hour', Trip.tpep_pickup_datetime)
        ).order_by(func.count().desc()).first()

        if ph_res:
            h = int(ph_res[0])
            suffix = 'AM' if h < 12 else 'PM'
            display_h = h % 12 or 12
            peak_hour = f"{display_h}:00 {suffix}"

    return jsonify({
        "total_trips":  total_trips,
        "avg_fare":     avg_fare,
        "avg_distance": avg_distance,
        "avg_tip_pct":  avg_tip_pct,
        "best_borough": best_borough,
        "peak_hour":    peak_hour,
    })


@trips_bp.route('/zones', methods=['GET'])
def get_zones_geojson():
    locations = db.session.query(
        Location.LocationID,
        Location.Borough,
        Location.Zone,
        Location.service_zone,
        Location.geometry
    ).all()

    features = []
    for loc in locations:
        if not loc.geometry:
            continue
        features.append({
            "type": "Feature",
            "properties": {
                "LocationID": loc.LocationID,
                "borough": loc.Borough or "Unknown",
                "zone": loc.Zone or "Unknown",
                "service_zone": loc.service_zone or "",
            },
            "geometry": loc.geometry
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })
