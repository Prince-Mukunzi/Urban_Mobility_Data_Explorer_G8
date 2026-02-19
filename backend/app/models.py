# This files maps the ERD columns to python classes

from app.models import db

class Vendors(db.Model):
    __tablename__ = 'vendors'
    VendorID = db.Column(db.BigInteger, primary_key=True)
    vendor_name = db.Column(db.String(150))


class PaymentType(db.Model):
    __tablename__ = 'payment_types'
    payment_type = db.Column(db.BigInteger, primary_key=True)
    payment_name = db.Column(db.String(100))


class RateCode(db.Model):
    __tablename__ = 'rate_codes'
    RatecodeID = db.Column(db.BigInteger, primary_key=True)
    rate_description = db.Column(db.String(100))

class Location(db.Model):
    __tablename__ = 'locations'
    LocationId = db.Colum(db.BigInteger, primary_Key=True)
    Borough = db.Column(db.String(150))
    Zone = db.Column(db.String(150))
    service_zone = db.Column(db.String(100))

class Trip(db.Model):
    __tablename__ = 'trips'
    trip_id = db.Column(db.BigInteger, primary_key=True)
    VendorID = db.Column(db.BigInteger, db.ForeignKey('vendors.VendorID'))
    tpep_pickup_datetime = db.Column(db.DateTime)
    tpep_dropoff_datetime = db.Column(db.DateTime)
    passenger_count = db.Column(db.Integer)
    trip_distance = db.Column(db.Numeric(10,2))
    RatecodeID = db.Column(db.BigInteger, db.ForeigenKey('rate_codes.RatecodeID'))
    store_and_fwd_flag = db.Column(db.Char(1))
    PULocationID = db.Column(db.BigInteger, db.ForeignKey('locations.LocationID'))
    DOLocationID = db.Column(db.BigInteger, db.ForeignKey('locations.LocationID'))
    payment_type = db.Column(db.BigInteger, db.ForeignKey('payment_types.payment_type'))
    fare_amount = db.Column(db.Numeric(10, 2))
    extrs = db.Column(db.Numeric(10, 2))
    mta_tax = db.Column(db.Numeric(10, 2))
    tip_amount = db.Column(db.Numeric(10, 2))
    tolls_amount = db.Column(db.Numeric(10, 2))
    improvement_surcharge = db.Column(db.Numeric(10, 2))
    total_amount = db.Column(db.Numeric(10, 2))
    congestion_surcharge = db.Column(db.Numeric(10, 2))

    # Relationships to enable trips.py endpoint to pull zone names for the UI
    pickup_loc = db.relationships('Location', foreign_keys=[PULocationID], backref='trips_starting_here')
    dropoff_loc = db.relationship('Location', foreign_keys=[DOLocationID], backref='trips_ending_here')
    vendor_ref = db.relationship('Vendor', backref='trips')

    