from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config
from werkzeug.middleware.proxy_fix import ProxyFix # Importa esto

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    db.init_app(app)

    from app.routes.main import main_bp
    from app.routes.products import products_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(products_bp, url_prefix='/productos')

    return app