# This files contains the authentication logic for logging in 

from flask import Blueprint, request, josonify 
from app.models import db
from werkzeug.security import generate_password_hash, check_password_hash 

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    # create a new usre 
    return jsonify({"message": "User registered successfully"}), 201 

@auth_bp.route('/login', methods=['POST'])
def login():
    # Verify user credentials 
    return jsonify({"message": "Login successful"}), 200
