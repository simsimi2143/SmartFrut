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
    imagen = db.Column(db.String(200), nullable=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'), nullable=False)
    
    # Nuevos campos
    codigo = db.Column(db.String(50), unique=True, nullable=True)
    codigo_barras = db.Column(db.String(100), nullable=True)
    codigo_caja = db.Column(db.String(50), nullable=True)
    habilitado = db.Column(db.Boolean, default=True)
    formato_venta = db.Column(db.String(10), default='kg')  # Cambiado de 'unidad' a 'kg'
    stock_minimo = db.Column(db.Float, default=0)
    stock_maximo = db.Column(db.Float, default=0)
    stock_actual = db.Column(db.Float, default=0)
    costo_unitario = db.Column(db.Float, default=0)
    costo_unitario_con_iva = db.Column(db.Float, default=0)
    margen_utilidad = db.Column(db.Float, default=0)
    iva_incluido = db.Column(db.Boolean, default=False)
    nombre_ticket = db.Column(db.String(100), nullable=True)

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
    cantidad = db.Column(db.Float, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    
    # Relación con Producto para acceder a sus atributos
    producto = db.relationship('Producto', backref='detalles_venta')