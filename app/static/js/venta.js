// Variables globales
let productoSeleccionadoId = null;
let productoSeleccionadoPrecio = 0;
const modal = document.getElementById('cantidad-modal');
const cantidadInput = document.getElementById('cantidad-input');

// Filtrar por categoría
document.querySelectorAll('.category-filter').forEach(btn => {
    btn.addEventListener('click', function() {
        const categoriaId = this.dataset.categoria === 'todos' ? '' : this.dataset.categoria;
        fetch(`/filtrar_productos?categoria_id=${categoriaId}`)
            .then(response => response.text())
            .then(html => {
                document.getElementById('productos-grid').innerHTML = html;
            });
    });
});

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
    });
});

// Actualizar cantidades desde carrito
document.addEventListener('click', function(e) {
    if (e.target.closest('.update-cantidad')) {
        const btn = e.target.closest('.update-cantidad');
        const productoId = btn.dataset.id;
        const nuevaCantidad = prompt('Nueva cantidad:', btn.dataset.cantidad);
        if (nuevaCantidad !== null) {
            const cant = parseFloat(nuevaCantidad);
            if (!isNaN(cant) && cant >= 0) {
                fetch('/actualizar_carrito', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ producto_id: productoId, cantidad: cant })
                })
                .then(response => response.json())
                .then(data => actualizarCarritoUI(data.carrito, data.total));
            }
        }
    }
    if (e.target.closest('.remove-item')) {
        const btn = e.target.closest('.remove-item');
        const productoId = btn.dataset.id;
        fetch('/actualizar_carrito', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ producto_id: productoId, cantidad: 0 })
        })
        .then(response => response.json())
        .then(data => actualizarCarritoUI(data.carrito, data.total));
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
                    alert('Venta registrada. Total: €' + data.total.toFixed(2));
                }
            });
    }
});

function actualizarCarritoUI(carrito, total) {
    // Recargar el HTML del carrito
    fetch('/carrito_html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('carrito-contenido').innerHTML = html;
            document.getElementById('total-carrito').innerText = '€' + total.toFixed(2);
        });
}