import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config
from werkzeug.middleware.proxy_fix import ProxyFix

db = SQLAlchemy()

def create_app():
    # Ajuste de rutas para PyInstaller
    if getattr(sys, 'frozen', False):
        # Carpeta temporal donde PyInstaller extrae templates y static
        template_dir = os.path.join(sys._MEIPASS, 'app', 'templates')
        static_dir = os.path.join(sys._MEIPASS, 'app', 'static')
        app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    else:
        app = Flask(__name__)

    app.config.from_object(Config)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    db.init_app(app)

    from app.routes.main import main_bp
    from app.routes.products import products_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(products_bp, url_prefix='/productos')

    return app