from app import create_app
from app.models import Producto
from app.database.db import db

app = create_app()

with app.app_context():
    # Actualizar todos los productos que tengan 'kilo' a 'kg'
    productos = Producto.query.filter_by(formato_venta='kilo').all()
    for p in productos:
        p.formato_venta = 'kg'
    
    # También actualizar los que tengan None o estén vacíos si quieres que por defecto sea kg
    productos_none = Producto.query.filter(Producto.formato_venta.is_(None)).all()
    for p in productos_none:
        p.formato_venta = 'kg'
    
    db.session.commit()
    print(f"Actualizados {len(productos)} productos de 'kilo' a 'kg'")
    print(f"Actualizados {len(productos_none)} productos de None a 'kg'")