from flask import Blueprint, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
import os
import uuid
from app.models import Categoria, Producto
from app.database.db import db
from config import Config

products_bp = Blueprint('products', __name__)

@products_bp.route('/')
def listar():
    # Mostrar todos los productos (activos e inactivos)
    productos = Producto.query.all()
    return render_template('gestion_productos.html', productos=productos)

@products_bp.route('/nuevo', methods=['GET', 'POST'])
def nuevo():
    categorias = Categoria.query.all()
    if request.method == 'POST':
        nombre_categoria = request.form['categoria']
        nombre_producto = request.form['nombre']
        precio = float(request.form['precio']) if request.form['precio'] else 0
        imagen = request.files.get('imagen')

        # Nuevos campos
        codigo = request.form.get('codigo')
        codigo_barras = request.form.get('codigo_barras')
        codigo_caja = request.form.get('codigo_caja')
        habilitado = 'habilitado' in request.form
        formato_venta = request.form.get('formato_venta', 'unidad')
        stock_minimo = float(request.form.get('stock_minimo', 0))
        stock_maximo = float(request.form.get('stock_maximo', 0))
        nombre_ticket = request.form.get('nombre_ticket')
        iva_incluido = 'iva_incluido' in request.form
        costo_unitario = float(request.form.get('costo_unitario', 0))
        costo_unitario_con_iva = float(request.form.get('costo_unitario_con_iva', 0))
        margen_utilidad = float(request.form.get('margen_utilidad', 0))

        # Buscar o crear categoría
        categoria = Categoria.query.filter_by(nombre=nombre_categoria).first()
        if not categoria:
            categoria = Categoria(nombre=nombre_categoria)
            db.session.add(categoria)
            db.session.commit()

        # Guardar imagen
        imagen_filename = None
        if imagen and imagen.filename != '':
            filename = secure_filename(imagen.filename)
            unique_name = str(uuid.uuid4()) + '_' + filename
            try:
                imagen.save(os.path.join(Config.UPLOAD_FOLDER, unique_name))
                imagen_filename = unique_name
            except Exception as e:
                flash(f'Error al guardar la imagen: {str(e)}', 'danger')

        producto = Producto(
            nombre=nombre_producto,
            precio=precio,
            imagen=imagen_filename,
            categoria_id=categoria.id,
            codigo=codigo,
            codigo_barras=codigo_barras,
            codigo_caja=codigo_caja,
            habilitado=habilitado,
            formato_venta=formato_venta,
            stock_minimo=stock_minimo,
            stock_maximo=stock_maximo,
            nombre_ticket=nombre_ticket,
            iva_incluido=iva_incluido,
            costo_unitario=costo_unitario,
            costo_unitario_con_iva=costo_unitario_con_iva,
            margen_utilidad=margen_utilidad
        )
        db.session.add(producto)
        db.session.commit()
        flash('Producto creado correctamente', 'success')
        return redirect(url_for('products.listar'))

    return render_template('producto_form.html', categorias=categorias, producto=None)

@products_bp.route('/editar/<int:id>', methods=['GET', 'POST'])
def editar(id):
    producto = Producto.query.get_or_404(id)
    categorias = Categoria.query.all()
    if request.method == 'POST':
        nombre_categoria = request.form['categoria']
        producto.nombre = request.form['nombre']
        producto.precio = float(request.form['precio']) if request.form['precio'] else 0
        imagen = request.files.get('imagen')

        producto.codigo = request.form.get('codigo')
        producto.codigo_barras = request.form.get('codigo_barras')
        producto.codigo_caja = request.form.get('codigo_caja')
        producto.habilitado = 'habilitado' in request.form
        producto.formato_venta = request.form.get('formato_venta', 'unidad')
        producto.stock_minimo = float(request.form.get('stock_minimo', 0))
        producto.stock_maximo = float(request.form.get('stock_maximo', 0))
        producto.nombre_ticket = request.form.get('nombre_ticket')
        producto.iva_incluido = 'iva_incluido' in request.form
        producto.costo_unitario = float(request.form.get('costo_unitario', 0))
        producto.costo_unitario_con_iva = float(request.form.get('costo_unitario_con_iva', 0))
        producto.margen_utilidad = float(request.form.get('margen_utilidad', 0))

        # Categoría
        categoria = Categoria.query.filter_by(nombre=nombre_categoria).first()
        if not categoria:
            categoria = Categoria(nombre=nombre_categoria)
            db.session.add(categoria)
            db.session.commit()
        producto.categoria_id = categoria.id

        # Imagen
        if imagen and imagen.filename != '':
            if producto.imagen:
                old_path = os.path.join(Config.UPLOAD_FOLDER, producto.imagen)
                if os.path.exists(old_path):
                    os.remove(old_path)
            filename = secure_filename(imagen.filename)
            unique_name = str(uuid.uuid4()) + '_' + filename
            try:
                imagen.save(os.path.join(Config.UPLOAD_FOLDER, unique_name))
                producto.imagen = unique_name
            except Exception as e:
                flash(f'Error al guardar la imagen: {str(e)}', 'danger')

        db.session.commit()
        flash('Producto actualizado', 'success')
        return redirect(url_for('products.listar'))

    return render_template('producto_form.html', categorias=categorias, producto=producto)

@products_bp.route('/eliminar/<int:id>', methods=['POST'])
def eliminar(id):
    producto = Producto.query.get_or_404(id)
    if producto.imagen:
        image_path = os.path.join(Config.UPLOAD_FOLDER, producto.imagen)
        if os.path.exists(image_path):
            os.remove(image_path)
    db.session.delete(producto)
    db.session.commit()
    flash('Producto eliminado', 'success')
    return redirect(url_for('products.listar'))