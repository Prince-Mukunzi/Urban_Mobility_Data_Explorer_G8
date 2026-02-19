# Main file to run flask app, ans starts the server on post 

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=3000)