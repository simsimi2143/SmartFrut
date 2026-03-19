from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from werkzeug.utils import secure_filename
import os
import uuid
from app.models import Categoria, Producto
from app.database.db import db
from config import Config

products_bp = Blueprint('products', __name__)

@products_bp.route('/')
def listar():
    productos = Producto.query.all()
    return render_template('gestion_productos.html', productos=productos)

@products_bp.route('/nuevo', methods=['GET', 'POST'])
def nuevo():
    categorias = Categoria.query.all()
    if request.method == 'POST':
        nombre_categoria = request.form['categoria']
        nombre_producto = request.form['nombre']
        precio = float(request.form['precio'])
        imagen = request.files.get('imagen')

        # Buscar o crear categoría
        categoria = Categoria.query.filter_by(nombre=nombre_categoria).first()
        if not categoria:
            categoria = Categoria(nombre=nombre_categoria)
            db.session.add(categoria)
            db.session.commit()

        producto = Producto(
            nombre=nombre_producto,
            precio=precio,
            categoria_id=categoria.id
        )
        db.session.add(producto)
        db.session.flush()  # Para obtener el ID si es necesario

        # Guardar imagen si se subió
        if imagen and imagen.filename != '':
            filename = secure_filename(imagen.filename)
            unique_name = str(uuid.uuid4()) + '_' + filename
            filepath = os.path.join(Config.UPLOAD_FOLDER, unique_name)
            try:
                imagen.save(filepath)
                producto.imagen = unique_name
                flash('Imagen guardada correctamente.', 'success')
            except Exception as e:
                flash(f'Error al guardar la imagen: {str(e)}', 'danger')
                # Si quieres, puedes registrar el error en un archivo de log
                # current_app.logger.error(f'Error saving image: {e}')

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
        producto.precio = float(request.form['precio'])
        imagen = request.files.get('imagen')

        # Categoría
        categoria = Categoria.query.filter_by(nombre=nombre_categoria).first()
        if not categoria:
            categoria = Categoria(nombre=nombre_categoria)
            db.session.add(categoria)
            db.session.commit()
        producto.categoria_id = categoria.id

        # Imagen
        if imagen and imagen.filename != '':
            # Eliminar imagen anterior si existe
            if producto.imagen:
                old_path = os.path.join(Config.UPLOAD_FOLDER, producto.imagen)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception as e:
                        flash(f'Error al eliminar la imagen anterior: {str(e)}', 'warning')
            # Guardar nueva imagen
            filename = secure_filename(imagen.filename)
            unique_name = str(uuid.uuid4()) + '_' + filename
            filepath = os.path.join(Config.UPLOAD_FOLDER, unique_name)
            try:
                imagen.save(filepath)
                producto.imagen = unique_name
                flash('Imagen actualizada correctamente.', 'success')
            except Exception as e:
                flash(f'Error al guardar la imagen: {str(e)}', 'danger')

        db.session.commit()
        flash('Producto actualizado', 'success')
        return redirect(url_for('products.listar'))

    return render_template('producto_form.html', categorias=categorias, producto=producto)

@products_bp.route('/eliminar/<int:id>', methods=['POST'])
def eliminar(id):
    producto = Producto.query.get_or_404(id)
    # Eliminar imagen si existe
    if producto.imagen:
        image_path = os.path.join(Config.UPLOAD_FOLDER, producto.imagen)
        if os.path.exists(image_path):
            try:
                os.remove(image_path)
            except Exception as e:
                flash(f'Error al eliminar la imagen: {str(e)}', 'warning')
    db.session.delete(producto)
    db.session.commit()
    flash('Producto eliminado', 'success')
    return redirect(url_for('products.listar'))