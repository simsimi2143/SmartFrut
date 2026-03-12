from app import create_app, db
from app.models import Categoria, Producto

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'Categoria': Categoria, 'Producto': Producto}

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Crear algunas categorías de ejemplo si no existen
        if not Categoria.query.first():
            db.session.add(Categoria(nombre='Frutas'))
            db.session.add(Categoria(nombre='Verduras'))
            db.session.commit()
    app.run(host='0.0.0.0', port=5000, debug=True)