import os
import sys

class Config:
    # Detectar si la app está "congelada" (es un .exe)
    if getattr(sys, 'frozen', False):
        # Si es el .exe, la base de datos y las fotos van a la par del ejecutable
        base_root = os.path.dirname(sys.executable)
    else:
        # Si es desarrollo, usamos la carpeta del proyecto
        base_root = os.path.abspath(os.path.dirname(__file__))

    SECRET_KEY = os.environ.get('SECRET_KEY') or 'tu-clave-secreta-verduleria'

    # Base de datos persistente fuera del EXE
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(base_root, 'fruteria.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Carpeta de fotos persistente fuera del EXE
    UPLOAD_FOLDER = os.path.join(base_root, 'imagenes_productos')

    # Crear la carpeta de imágenes si no existe al iniciar
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    # ============================================
    # CONFIGURACIÓN DEL NEGOCIO PARA BOLETAS
    # ============================================

    # Nombre del negocio que aparecerá en la boleta
    NEGOCIO_NOMBRE = 'FRUTERIA GREEN MARKET'

    # Dirección del negocio (opcional)
    NEGOCIO_DIRECCION = 'Santa María 316 (frente al Trébol)'

    # Teléfono del negocio (opcional)
    NEGOCIO_TELEFONO = '+56 9 1234 5678'

    # RUT del negocio (opcional)
    NEGOCIO_RUT = '12.345.678-9'

    # ============================================
    # CONFIGURACIÓN DE LA IMPRESORA TÉRMICA
    # ============================================

    # Puerto serial donde está conectada la impresora
    PRINTER_PORT = 'COM3'

    # Velocidad de comunicación (baudrate)
    PRINTER_BAUDRATE = 9600

    # Timeout de conexión en segundos
    PRINTER_TIMEOUT = 5