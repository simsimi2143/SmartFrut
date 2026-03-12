from app.database.db import db

class Categoria(db.Model):
    __tablename__ = 'categorias'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    productos = db.relationship('Producto', backref='categoria', lazy=True)

class Producto(db.Model):
    __tablename__ = 'productos'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    precio = db.Column(db.Float, nullable=False)
    imagen = db.Column(db.String(200), nullable=True)  # Ruta de la imagen
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'), nullable=False)

class Venta(db.Model):
    __tablename__ = 'ventas'
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=db.func.current_timestamp())
    total = db.Column(db.Float, nullable=False)
    detalles = db.relationship('DetalleVenta', backref='venta', lazy=True)

class DetalleVenta(db.Model):
    __tablename__ = 'detalles_venta'
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('ventas.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    cantidad = db.Column(db.Float, nullable=False)  # Puede ser peso o unidades
    precio_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)