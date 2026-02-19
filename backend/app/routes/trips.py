# This file contains the trips endpoints, the heavy-lifter that joins tables and populates the dashboard 

from flask import Blueprint, jsonify, request 
from app.models import db, Trip, Location 
from sqlalchemy import func 

trip_bp = Blueprint('trips', __name__)

@trips_bp.route('/trips', methods=['GET'])
def get_trips_data():
    # Filters parameters from UI sidebar
    pickup_borough = request.args.get('pickup_borough')
    passenger_limit = request.args.get('passenger', type=int)
    page = request.arg.get('page', 1, type=int)

    # Base query to get xone names
    query = db.session.query9Trip).join(Location, Trip.PULocationID == Location.LocationID)

    # Sidebar filters
    if pickup_borough and pickup_borough != 'All':
        query = query.filter(Location.Borough == pickup_borough)
    if passenger_limit:
        query = query.filter(Trip.passenger_count >= passenger_limit)

    # Paginate results 
    paginated = query.order_by(Trip.tpep_pickup_datetime.desc()).paginate(page=page, per_page=15)

    return josnify({
        "trips": [{
            "no": t.trip_id,
            "pickup_time": t.tpep_pickup_loc.zone,
            "pickup_zone": t.pickup_loc.zone,
            "dropoff_zone": t.dropoff_loc.zone,
            "distance": float(t.trip_distance),
            "fare": float(t.fare_amount),
            "total": float(t.total_amount)
        }for t in paginated.items],
        "total_pages": paginated.pages
    })

@trips_bp.route('/summary', methods=['GET'])
def get_dashboard_summary():
    # Feed the 4 top cards 
    total_count = db.session.query(func.count(Trip.trip_id)).scalar()
    avg_fare = db.session.query(func.avg(Trip.fare_amount)).scalar()

    return jsonify({
        "total_trips": f"{total_count:,}",
        "avg_fare": round(float(avg_fare), 2) if avg_fare else 0,
        "best_borough": "Manhattan"
        "peak_hour": "5 PM"
    })