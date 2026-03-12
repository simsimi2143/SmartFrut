from flask import Blueprint, render_template, request, jsonify
from app.models import Producto

weigh_bp = Blueprint('weigh', __name__)

@weigh_bp.route('/')
def seleccionar_producto():
    productos = Producto.query.all()
    return render_template('select_weigh.html', productos=productos)

@weigh_bp.route('/calcular', methods=['POST'])
def calcular_costo():
    data = request.get_json()
    producto_id = data['producto_id']
    peso = float(data['peso'])  # en kg
    producto = Producto.query.get(producto_id)
    costo_total = producto.precio * peso
    return jsonify({'costo': round(costo_total, 2)})