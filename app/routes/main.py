from flask import Blueprint, render_template, session, request, jsonify, send_from_directory, abort
from app.models import Categoria, Producto, Venta, DetalleVenta
from app.database.db import db
from sqlalchemy import func
from config import Config
from datetime import datetime
import os

# Importar el módulo de boletas
try:
    from app.routes.boleta import imprimir_boleta, detectar_impresora
    BOLETA_MODULE_AVAILABLE = True
except ImportError:
    BOLETA_MODULE_AVAILABLE = False

main_bp = Blueprint('main', __name__)

# ============================================
# CONFIGURACIÓN DE IVA
# ============================================
IVA_TASA = 0.19  # 19% IVA en Chile
PER_PAGE = 8

def calcular_precio_con_iva(precio_sin_iva):
    """Calcula el precio con IVA incluido"""
    return precio_sin_iva * (1 + IVA_TASA)

def calcular_iva_desde_total(total):
    """Calcula el monto de IVA desde un total con IVA incluido"""
    return total - (total / (1 + IVA_TASA))

@main_bp.route('/')
def index():
    categorias = Categoria.query.all()
    # Paginación de productos activos (página 1 inicial)
    page = request.args.get('page', 1, type=int)
    pagination = Producto.query.filter_by(habilitado=True).paginate(
        page=page, per_page=PER_PAGE, error_out=False
    )
    productos = pagination.items
    if 'carrito' not in session:
        session['carrito'] = []
    return render_template('venta.html',
                           categorias=categorias,
                           productos=productos,
                           pagination=pagination)

@main_bp.route('/filtrar_productos')
def filtrar_productos():
    categoria_id = request.args.get('categoria_id', type=int)
    query = Producto.query.filter_by(habilitado=True)
    if categoria_id:
        query = query.filter_by(categoria_id=categoria_id)
    productos = query.all()
    return render_template('partials/productos_grid.html', productos=productos)

@main_bp.route('/buscar_productos')
def buscar_productos():
    query_text = request.args.get('q', '').strip()
    codigo = request.args.get('codigo', '').strip()
    page = request.args.get('page', 1, type=int)

    productos_query = Producto.query.filter_by(habilitado=True)

    # Búsqueda por código (prioritaria si se proporciona)
    if codigo:
        productos_query = productos_query.filter(
            db.or_(
                Producto.codigo.ilike(f'%{codigo}%'),
                Producto.codigo_barras.ilike(f'%{codigo}%'),
                Producto.codigo_caja.ilike(f'%{codigo}%')
            )
        )
    # Búsqueda por nombre
    elif query_text:
        productos_query = productos_query.filter(Producto.nombre.ilike(f'%{query_text}%'))

    pagination = productos_query.paginate(page=page, per_page=PER_PAGE, error_out=False)
    productos = pagination.items

    # Devolvemos el partial incluyendo los controles de paginación
    return render_template('partials/productos_grid.html',
                           productos=productos,
                           pagination=pagination)

@main_bp.route('/agregar_al_carrito', methods=['POST'])
def agregar_al_carrito():
    data = request.get_json()
    producto_id = data['producto_id']
    cantidad = float(data.get('cantidad', 1))
    producto = Producto.query.get_or_404(producto_id)

    if not producto.habilitado:
        return jsonify({'error': 'Producto no disponible'}), 400

    carrito = session.get('carrito', [])

    # Determinar tipo de unidad
    tipo_unidad = producto.formato_venta if hasattr(producto, 'formato_venta') and producto.formato_venta else 'unidad'
    iva_incluido = producto.iva_incluido if hasattr(producto, 'iva_incluido') else False

    for item in carrito:
        if item['producto_id'] == producto_id:
            item['cantidad'] += cantidad
            item['subtotal'] = item['cantidad'] * item['precio']
            break
    else:
        carrito.append({
            'producto_id': producto_id,
            'nombre': producto.nombre,
            'precio': producto.precio,
            'cantidad': cantidad,
            'subtotal': cantidad * producto.precio,
            'tipo_unidad': tipo_unidad,
            'iva_incluido': iva_incluido
        })
    session['carrito'] = carrito
    total = sum(item['subtotal'] for item in carrito)
    return jsonify({'carrito': carrito, 'total': total})

@main_bp.route('/actualizar_carrito', methods=['POST'])
def actualizar_carrito():
    data = request.get_json()
    producto_id = data['producto_id']
    nueva_cantidad = float(data['cantidad'])
    carrito = session.get('carrito', [])
    for item in carrito:
        if item['producto_id'] == producto_id:
            if nueva_cantidad <= 0:
                carrito.remove(item)
            else:
                item['cantidad'] = nueva_cantidad
                item['subtotal'] = nueva_cantidad * item['precio']
            break
    session['carrito'] = carrito
    total = sum(item['subtotal'] for item in carrito)
    return jsonify({'carrito': carrito, 'total': total})

@main_bp.route('/actualizar_precio_carrito', methods=['POST'])
def actualizar_precio_carrito():
    """Permite actualizar el precio de un producto directamente en el carrito."""
    data = request.get_json()
    producto_id = data['producto_id']
    nuevo_precio = float(data['precio'])

    if nuevo_precio < 0:
        return jsonify({'error': 'El precio no puede ser negativo'}), 400

    carrito = session.get('carrito', [])
    for item in carrito:
        if item['producto_id'] == producto_id:
            item['precio'] = nuevo_precio
            item['subtotal'] = item['cantidad'] * nuevo_precio
            break
    else:
        return jsonify({'error': 'Producto no encontrado en el carrito'}), 404

    session['carrito'] = carrito
    total = sum(item['subtotal'] for item in carrito)
    return jsonify({'carrito': carrito, 'total': total})

@main_bp.route('/carrito_html')
def carrito_html():
    return render_template('partials/carrito.html', carrito=session.get('carrito', []))

# ============================================
# PAGAR - Procesa el pago con IVA
# ============================================
@main_bp.route('/pagar', methods=['POST'])
def pagar():
    """Procesa el pago, guarda la venta y genera datos de la boleta."""
    data = request.get_json()
    carrito = data.get('carrito', [])  # Recibe carrito del frontend
    if not carrito:
        return jsonify({'error': 'Carrito vacío'}), 400

    # Calcular totales considerando si cada producto tiene IVA incluido o no
    total_sin_iva = 0
    total_iva = 0
    
    for item in carrito:
        precio = item['precio']
        cantidad = item['cantidad']
        subtotal_item = precio * cantidad
        
        if item.get('iva_incluido', False):
            # El precio ya incluye IVA
            subtotal_sin_iva_item = subtotal_item / (1 + IVA_TASA)
            iva_item = subtotal_item - subtotal_sin_iva_item
        else:
            # El precio NO incluye IVA, hay que sumarlo
            subtotal_sin_iva_item = subtotal_item
            iva_item = subtotal_item * IVA_TASA
        
        total_sin_iva += subtotal_sin_iva_item
        total_iva += iva_item

    total_final = total_sin_iva + total_iva

    venta = Venta(total=total_final)
    db.session.add(venta)
    db.session.flush()

    for item in carrito:
        detalle = DetalleVenta(
            venta_id=venta.id,
            producto_id=item['producto_id'],
            cantidad=item['cantidad'],
            precio_unitario=item['precio'],
            subtotal=item['cantidad'] * item['precio']
        )
        db.session.add(detalle)

    db.session.commit()

    # Preparar datos de la boleta
    now = datetime.now()
    items_boleta = []
    items_con_iva = 0

    for item in carrito:
        if item.get('iva_incluido'):
            items_con_iva += 1
        items_boleta.append({
            'nombre': item['nombre'],
            'cantidad': item['cantidad'],
            'precio': item['precio'],
            'subtotal': item['subtotal'],
            'tipo_unidad': item.get('tipo_unidad', 'unidad'),
            'iva_incluido': item.get('iva_incluido', False)
        })

    boleta = {
        'venta_id': venta.id,
        'fecha': now.strftime('%d/%m/%Y'),
        'hora': now.strftime('%H:%M:%S'),
        'negocio': {
            'nombre': getattr(Config, 'NEGOCIO_NOMBRE', 'FRUTERIA'),
            'direccion': getattr(Config, 'NEGOCIO_DIRECCION', ''),
            'telefono': getattr(Config, 'NEGOCIO_TELEFONO', ''),
            'rut': getattr(Config, 'NEGOCIO_RUT', '')
        },
        'items': items_boleta,
        'totales': {
            'subtotal': total_sin_iva,
            'iva': total_iva,
            'total': total_final,
            'items_con_iva': items_con_iva
        }
    }

    # Detectar impresora
    impresora_detectada = detectar_impresora() if BOLETA_MODULE_AVAILABLE else False

    session['ultima_venta_id'] = venta.id
    session['carrito'] = []

    return jsonify({
        'success': True, 
        'total': total_final,
        'venta_id': venta.id,
        'boleta': boleta,
        'impresora_detectada': impresora_detectada
    })

# ============================================
# OBTENER BOLETA - Para reimprimir
# ============================================
@main_bp.route('/obtener_boleta/<int:venta_id>')
def obtener_boleta(venta_id):
    """Obtiene los datos de una boleta para mostrar en el modal."""
    venta = Venta.query.get_or_404(venta_id)

    now = venta.fecha
    items_boleta = []
    items_con_iva = 0

    for detalle in venta.detalles:
        producto = detalle.producto
        tipo_unidad = producto.formato_venta if hasattr(producto, 'formato_venta') and producto.formato_venta else 'unidad'
        iva_incluido = producto.iva_incluido if hasattr(producto, 'iva_incluido') else False

        if iva_incluido:
            items_con_iva += 1

        items_boleta.append({
            'nombre': detalle.producto.nombre,
            'cantidad': detalle.cantidad,
            'precio': detalle.precio_unitario,
            'subtotal': detalle.subtotal,
            'tipo_unidad': tipo_unidad,
            'iva_incluido': iva_incluido
        })

    # Calcular totales con IVA
    total = venta.total
    subtotal_sin_iva = total / (1 + IVA_TASA)
    monto_iva = total - subtotal_sin_iva

    boleta = {
        'venta_id': venta.id,
        'fecha': now.strftime('%d/%m/%Y'),
        'hora': now.strftime('%H:%M:%S'),
        'negocio': {
            'nombre': getattr(Config, 'NEGOCIO_NOMBRE', 'FRUTERIA'),
            'direccion': getattr(Config, 'NEGOCIO_DIRECCION', ''),
            'telefono': getattr(Config, 'NEGOCIO_TELEFONO', ''),
            'rut': getattr(Config, 'NEGOCIO_RUT', '')
        },
        'items': items_boleta,
        'totales': {
            'subtotal': subtotal_sin_iva,
            'iva': monto_iva,
            'total': total,
            'items_con_iva': items_con_iva
        }
    }

    impresora_detectada = detectar_impresora() if BOLETA_MODULE_AVAILABLE else False

    return jsonify({
        'success': True,
        'boleta': boleta,
        'impresora_detectada': impresora_detectada
    })

# ============================================
# IMPRIMIR BOLETA
# ============================================
@main_bp.route('/imprimir_boleta/<int:venta_id>', methods=['POST'])
def imprimir_boleta_route(venta_id):
    """Imprime la boleta en la impresora térmica."""
    if not BOLETA_MODULE_AVAILABLE:
        return jsonify({
            'success': False,
            'message': 'Módulo de impresión no disponible'
        })

    venta = Venta.query.get_or_404(venta_id)

    items = []
    for detalle in venta.detalles:
        producto = detalle.producto
        tipo_unidad = producto.formato_venta if hasattr(producto, 'formato_venta') and producto.formato_venta else 'unidad'

        items.append({
            'nombre': detalle.producto.nombre,
            'cantidad': detalle.cantidad,
            'precio': detalle.precio_unitario,
            'subtotal': detalle.subtotal,
            'tipo_unidad': tipo_unidad
        })

    # Calcular IVA
    total = venta.total
    subtotal_sin_iva = total / (1 + IVA_TASA)
    monto_iva = total - subtotal_sin_iva

    datos_venta = {
        'id': venta.id,
        'fecha': venta.fecha,
        'items': items,
        'total': total,
        'subtotal': subtotal_sin_iva,
        'iva': monto_iva,
        'negocio': {
            'nombre': getattr(Config, 'NEGOCIO_NOMBRE', 'FRUTERIA'),
            'direccion': getattr(Config, 'NEGOCIO_DIRECCION', ''),
            'telefono': getattr(Config, 'NEGOCIO_TELEFONO', ''),
            'rut': getattr(Config, 'NEGOCIO_RUT', '')
        }
    }

    resultado = imprimir_boleta(datos_venta)

    return jsonify({
        'success': resultado['success'],
        'message': resultado['message'],
        'impresora_detectada': resultado.get('impresora_detectada', False)
    })

@main_bp.route('/caja')
def ver_caja():
    total_obtenido = db.session.query(func.sum(Venta.total)).scalar() or 0
    ventas = Venta.query.order_by(Venta.fecha.desc()).all()
    return render_template('caja.html', total=total_obtenido, ventas=ventas)

@main_bp.route('/venta_detalle/<int:venta_id>')
def venta_detalle(venta_id):
    venta = Venta.query.get_or_404(venta_id)
    detalles = []
    for d in venta.detalles:
        detalles.append({
            'producto': d.producto.nombre,
            'cantidad': d.cantidad,
            'precio_unitario': d.precio_unitario,
            'subtotal': d.subtotal
        })
    return jsonify({
        'id': venta.id,
        'fecha': venta.fecha.strftime('%d/%m/%Y %H:%M'),
        'total': venta.total,
        'detalles': detalles
    })

@main_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    if '..' in filename or filename.startswith('/'):
        abort(404)
    return send_from_directory(Config.UPLOAD_FOLDER, filename)