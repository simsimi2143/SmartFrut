// Variables globales
let productoSeleccionadoId = null;
let productoSeleccionadoPrecio = 0;
const modal = document.getElementById('cantidad-modal');
const cantidadInput = document.getElementById('cantidad-input');
const buscador = document.getElementById('buscador');
let categoriaActiva = ''; // '' significa todas

// Función para cargar productos filtrados
function cargarProductos() {
    const query = buscador ? buscador.value : '';
    let url = `/buscar_productos?q=${encodeURIComponent(query)}`;
    if (categoriaActiva) {
        url += `&categoria_id=${categoriaActiva}`;
    }
    fetch(url)
        .then(response => response.text())
        .then(html => {
            document.getElementById('productos-grid').innerHTML = html;
        })
        .catch(error => console.error('Error al cargar productos:', error));
}

// Filtrar por categoría
document.querySelectorAll('.category-filter').forEach(btn => {
    btn.addEventListener('click', function() {
        categoriaActiva = this.dataset.categoria === 'todos' ? '' : this.dataset.categoria;
        cargarProductos(); // recargar con la categoría seleccionada
    });
});

// Buscador en tiempo real
if (buscador) {
    buscador.addEventListener('input', function() {
        cargarProductos();
    });
}

// Abrir modal al hacer clic en añadir
document.addEventListener('click', function(e) {
    if (e.target.closest('.add-to-cart')) {
        const btn = e.target.closest('.add-to-cart');
        productoSeleccionadoId = btn.dataset.id;
        productoSeleccionadoPrecio = parseFloat(btn.dataset.precio);
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        cantidadInput.value = 1;
        cantidadInput.focus();
    }
});

// Cancelar modal
document.getElementById('cancelar-modal').addEventListener('click', function() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
});

// Confirmar cantidad
document.getElementById('confirmar-cantidad').addEventListener('click', function() {
    const cantidad = parseFloat(cantidadInput.value);
    if (isNaN(cantidad) || cantidad <= 0) {
        alert('Ingresa una cantidad válida');
        return;
    }
    fetch('/agregar_al_carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: productoSeleccionadoId, cantidad: cantidad })
    })
    .then(response => response.json())
    .then(data => {
        actualizarCarritoUI(data.carrito, data.total);
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    })
    .catch(error => console.error('Error:', error));
});

// Manejar clics en el carrito
document.addEventListener('click', function(e) {
    // Botones + y -
    if (e.target.closest('.update-cantidad')) {
        const btn = e.target.closest('.update-cantidad');
        const productoId = btn.dataset.id;
        let nuevaCantidad;
        if (btn.dataset.op === 'incr') {
            nuevaCantidad = parseFloat(btn.dataset.cantidad);
        } else if (btn.dataset.op === 'decr') {
            nuevaCantidad = parseFloat(btn.dataset.cantidad);
        } else {
            nuevaCantidad = prompt('Nueva cantidad:', btn.dataset.cantidad);
        }
        if (nuevaCantidad !== undefined && nuevaCantidad !== null) {
            const cant = parseFloat(nuevaCantidad);
            if (!isNaN(cant) && cant >= 0) {
                fetch('/actualizar_carrito', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ producto_id: productoId, cantidad: cant })
                })
                .then(response => response.json())
                .then(data => actualizarCarritoUI(data.carrito, data.total))
                .catch(error => console.error('Error:', error));
            }
        }
    }
    // Botón eliminar
    if (e.target.closest('.remove-item')) {
        const btn = e.target.closest('.remove-item');
        const productoId = btn.dataset.id;
        fetch('/actualizar_carrito', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ producto_id: productoId, cantidad: 0 })
        })
        .then(response => response.json())
        .then(data => actualizarCarritoUI(data.carrito, data.total))
        .catch(error => console.error('Error:', error));
    }
});

// Teclado numérico
document.querySelectorAll('.num-key').forEach(btn => {
    btn.addEventListener('click', function() {
        const key = this.innerText;
        if (document.activeElement && document.activeElement.tagName === 'INPUT') {
            const input = document.activeElement;
            if (key === 'C') {
                input.value = '';
            } else {
                input.value += key;
            }
        }
    });
});

// Pagar
document.getElementById('pagar-btn').addEventListener('click', function() {
    if (confirm('¿Confirmar pago?')) {
        fetch('/pagar', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    actualizarCarritoUI([], 0);
                    alert('Venta registrada. Total: $' + data.total.toFixed(0));
                }
            })
            .catch(error => console.error('Error:', error));
    }
});

// Botón de impresión (placeholder)
document.getElementById('imprimir-btn').addEventListener('click', function() {
    alert('Función de impresión no implementada aún.');
});

function actualizarCarritoUI(carrito, total) {
    fetch('/carrito_html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('carrito-contenido').innerHTML = html;
            document.getElementById('total-carrito').innerText = total.toFixed(0);
        })
        .catch(error => console.error('Error:', error));
}

// Al cargar la página, aseguramos que el buscador y filtros funcionen
document.addEventListener('DOMContentLoaded', function() {
    // Si hay un parámetro de categoría en la URL, podríamos setearlo, pero no es necesario
});