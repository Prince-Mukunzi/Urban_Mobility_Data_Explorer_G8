# Intialize the app, builds the app and connects routes 

from flask import Flask 
from app.config import Config 
from app.models import db 

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    # API files & endpoints
    from app.routes.auth import auth_bp
    from app.routes.trips import trip_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(trips_bp, url_prefix="/api")

    return app
