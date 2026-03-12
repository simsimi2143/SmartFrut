import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = 'tu-clave-secreta-cambiar-en-produccion'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'app/database/fruteria.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(basedir, 'app/static/images')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB