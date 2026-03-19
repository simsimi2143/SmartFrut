from flask import Blueprint, render_template, session, request, jsonify, send_from_directory, abort
from app.models import Categoria, Producto, Venta, DetalleVenta
from app.database.db import db
from sqlalchemy import func
from config import Config
import os

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    categorias = Categoria.query.all()
    productos = Producto.query.filter_by(habilitado=True).all()
    if 'carrito' not in session:
        session['carrito'] = []
    return render_template('venta.html', categorias=categorias, productos=productos)

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
    categoria_id = request.args.get('categoria_id', type=int)
    
    productos_query = Producto.query.filter_by(habilitado=True)
    
    if categoria_id:
        productos_query = productos_query.filter_by(categoria_id=categoria_id)
    
    if query_text:
        productos_query = productos_query.filter(Producto.nombre.ilike(f'%{query_text}%'))
    
    productos = productos_query.all()
    return render_template('partials/productos_grid.html', productos=productos)

@main_bp.route('/agregar_al_carrito', methods=['POST'])
def agregar_al_carrito():
    data = request.get_json()
    producto_id = data['producto_id']
    cantidad = float(data.get('cantidad', 1))
    producto = Producto.query.get_or_404(producto_id)
    
    if not producto.habilitado:
        return jsonify({'error': 'Producto no disponible'}), 400

    carrito = session.get('carrito', [])
    for item in carrito:
        if item['producto_id'] == producto_id:
            item['cantidad'] += cantidad
            item['subtotal'] = item['cantidad'] * producto.precio
            break
    else:
        carrito.append({
            'producto_id': producto_id,
            'nombre': producto.nombre,
            'precio': producto.precio,
            'cantidad': cantidad,
            'subtotal': cantidad * producto.precio
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

@main_bp.route('/carrito_html')
def carrito_html():
    return render_template('partials/carrito.html', carrito=session.get('carrito', []))

@main_bp.route('/pagar', methods=['POST'])
def pagar():
    carrito = session.get('carrito', [])
    if not carrito:
        return jsonify({'error': 'Carrito vacío'}), 400

    total = sum(item['subtotal'] for item in carrito)
    venta = Venta(total=total)
    db.session.add(venta)
    db.session.flush()

    for item in carrito:
        detalle = DetalleVenta(
            venta_id=venta.id,
            producto_id=item['producto_id'],
            cantidad=item['cantidad'],
            precio_unitario=item['precio'],
            subtotal=item['subtotal']
        )
        db.session.add(detalle)

    db.session.commit()
    session['carrito'] = []
    return jsonify({'success': True, 'total': total})

@main_bp.route('/caja')
def ver_caja():
    total_obtenido = db.session.query(func.sum(Venta.total)).scalar() or 0
    ventas = Venta.query.order_by(Venta.fecha.desc()).all()
    return render_template('caja.html', total=total_obtenido, ventas=ventas)

# NUEVA RUTA: Obtener detalle de una venta específica (para el modal)
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