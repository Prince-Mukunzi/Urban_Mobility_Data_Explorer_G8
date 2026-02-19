import mysql.connector
import json
from flask import Flask, jsonify, render_template

app = Flask(__name__)

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'password',
    'database': 'taxi_system',
}


def get_db_connection():
    return mysql.connector.connect(**db_config)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/map-data')
def get_map_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT ID, borough, zone, service_zone, geometry FROM locations")
    locations = cursor.fetchall()
    cursor.close()
    conn.close()

    # Convert to GeoJSON
    features = []
    for loc in locations:
        # Parse the geometry JSON from database
        geometry = json.loads(loc['geometry'])

        features.append({
            "type": "Feature",
            "properties": {
                "id": loc['ID'],
                "zone": loc['zone'],
                "borough": loc['borough'],
                "service_zone": loc['service_zone']
            },
            "geometry": geometry  # Use the polygon directly!
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
