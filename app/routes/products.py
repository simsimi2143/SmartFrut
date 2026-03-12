from flask import Blueprint, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
import os
from app.models import Categoria, Producto
from app.database.db import db
from config import Config

products_bp = Blueprint('products', __name__)

@products_bp.route('/')
def listar():
    print("Host header:", request.headers.get('Host'))
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

        # Guardar imagen si se subió
        imagen_filename = None
        if imagen and imagen.filename != '':
            filename = secure_filename(imagen.filename)
            # Añadir un identificador único para evitar colisiones
            import uuid
            unique_name = str(uuid.uuid4()) + '_' + filename
            imagen.save(os.path.join(Config.UPLOAD_FOLDER, unique_name))
            imagen_filename = unique_name

        producto = Producto(
            nombre=nombre_producto,
            precio=precio,
            imagen=imagen_filename,
            categoria_id=categoria.id
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
                    os.remove(old_path)
            filename = secure_filename(imagen.filename)
            import uuid
            unique_name = str(uuid.uuid4()) + '_' + filename
            imagen.save(os.path.join(Config.UPLOAD_FOLDER, unique_name))
            producto.imagen = unique_name

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
            os.remove(image_path)
    db.session.delete(producto)
    db.session.commit()
    flash('Producto eliminado', 'success')
    return redirect(url_for('products.listar'))