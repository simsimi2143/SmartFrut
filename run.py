import sys
import os
import webview # Importamos la nueva librería
from threading import Thread
from app import create_app, db
from app.models import Categoria, Producto

app = create_app()

def run_flask():
    # Ejecuta Flask sin el modo debug y sin el reloader
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not Categoria.query.first():
            db.session.add(Categoria(nombre='Frutas'))
            db.session.add(Categoria(nombre='Verduras'))
            db.session.commit()

    # Iniciamos Flask en un hilo separado para que no bloquee la ventana
    t = Thread(target=run_flask)
    t.daemon = True
    t.start()

    # Creamos la ventana nativa de escritorio
    # 'width' y 'height' son el tamaño inicial de tu ventana
    webview.create_window('SmartFrut - Gestión de Verdulería', 'http://127.0.0.1:5000')
    webview.start()