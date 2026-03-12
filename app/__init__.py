from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    # Registrar blueprints
    from app.routes.main import main_bp
    from app.routes.products import products_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(products_bp, url_prefix='/productos')

    return app