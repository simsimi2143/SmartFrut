// Variables globales
let productoSeleccionadoId = null;
let productoSeleccionadoPrecio = 0;
const modal = document.getElementById('cantidad-modal');
const cantidadInput = document.getElementById('cantidad-input');
const buscador = document.getElementById('buscador');
let categoriaActiva = 'todos';
let ultimaVentaId = null;
let datosUltimaBoleta = null;

// Función para cargar productos filtrados
function cargarProductos() {
    const query = buscador ? buscador.value : '';
    let url = `/buscar_productos?q=${encodeURIComponent(query)}`;
    if (categoriaActiva && categoriaActiva !== 'todos') {
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
document.querySelectorAll('.categoria-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('activa'));
        this.classList.add('activa');
        categoriaActiva = this.dataset.categoria;
        cargarProductos();
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

// Manejar cambio de precio en el carrito
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('update-precio')) {
        const input = e.target;
        const productoId = input.dataset.id;
        const nuevoPrecio = parseFloat(input.value);

        if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
            alert('Ingresa un precio válido');
            actualizarCarritoUI(null, null);
            return;
        }

        fetch('/actualizar_precio_carrito', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ producto_id: productoId, precio: nuevoPrecio })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                actualizarCarritoUI(data.carrito, data.total);
            }
        })
        .catch(error => console.error('Error al actualizar precio:', error));
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

// ============================================
// PAGAR - Procesa el pago
// ============================================
document.getElementById('pagar-btn').addEventListener('click', function() {
    if (confirm('¿Confirmar pago?')) {
        fetch('/pagar', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    ultimaVentaId = data.venta_id;
                    datosUltimaBoleta = data.boleta;
                    actualizarCarritoUI([], 0);

                    // Habilitar botón de impresión
                    const imprimirBtn = document.getElementById('imprimir-btn');
                    if (imprimirBtn) {
                        imprimirBtn.disabled = false;
                        imprimirBtn.dataset.ventaId = data.venta_id;
                    }

                    // Mostrar el ticket automáticamente
                    mostrarTicketModal(data.boleta, data.impresora_detectada);
                }
            })
            .catch(error => console.error('Error:', error));
    }
});

// ============================================
// MODAL DEL TICKET - Funciones
// ============================================

// Mostrar el modal con el ticket
function mostrarTicketModal(boleta, impresoraDetectada) {
    const modal = document.getElementById('ticket-modal');
    const contenido = document.getElementById('ticket-contenido');
    const alertaContainer = document.getElementById('alerta-impresora-container');

    // Generar HTML del ticket
    contenido.innerHTML = generarHTMLTicket(boleta);

    // Mostrar alerta si no hay impresora
    if (!impresoraDetectada) {
        alertaContainer.innerHTML = `
            <div class="alerta-impresora-modal">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No se detectó impresora térmica. Use "Imp. Sistema" para imprimir.</span>
            </div>
        `;
    } else {
        alertaContainer.innerHTML = '';
    }

    // Guardar datos para impresión
    datosUltimaBoleta = boleta;

    // Mostrar modal
    modal.classList.add('activo');
}

// Cerrar el modal del ticket
function cerrarTicketModal() {
    const modal = document.getElementById('ticket-modal');
    modal.classList.remove('activo');
}

// Generar HTML del ticket
function generarHTMLTicket(boleta) {
    const negocio = boleta.negocio;
    const items = boleta.items;
    const totales = boleta.totales;

    let itemsHTML = '';
    items.forEach(item => {
        const cantidad = item.cantidad % 1 === 0 ? item.cantidad : item.cantidad.toFixed(2);
        const unidadIcono = item.tipo_unidad === 'kg' ? '<i class="fas fa-weight-hanging"></i>' : '<i class="fas fa-box"></i>';
        const unidadTexto = item.tipo_unidad === 'kg' ? 'kg' : 'unid';

        itemsHTML += `
            <tr>
                <td>
                    ${item.nombre}
                    <span class="unidad-tipo">${unidadIcono} ${unidadTexto}</span>
                </td>
                <td style="text-align: center;">${cantidad}</td>
                <td style="text-align: right;">
                    $${Math.round(item.precio).toLocaleString()}
                    ${item.iva_incluido ? '<span style="color: #059669;">*</span>' : ''}
                </td>
                <td style="text-align: right;">$${Math.round(item.subtotal).toLocaleString()}</td>
            </tr>
        `;
    });

    return `
        <div class="ticket-header">
            <h2>${negocio.nombre}</h2>
            ${negocio.direccion ? `<p>${negocio.direccion}</p>` : ''}
            ${negocio.telefono ? `<p>TEL: ${negocio.telefono}</p>` : ''}
            ${negocio.rut ? `<p>RUT: ${negocio.rut}</p>` : ''}
        </div>

        <div class="ticket-info">
            <p><strong>BOLETA N°:</strong> ${String(boleta.venta_id).padStart(6, '0')}</p>
            <p><strong>FECHA:</strong> ${boleta.fecha}</p>
            <p><strong>HORA:</strong> ${boleta.hora}</p>
        </div>

        <table class="ticket-items">
            <thead>
                <tr>
                    <th>PRODUCTO</th>
                    <th style="text-align: center;">CANT</th>
                    <th style="text-align: right;">PRECIO</th>
                    <th style="text-align: right;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div class="ticket-totales">
            <div class="fila-total">
                <span>Subtotal:</span>
                <span>$${Math.round(totales.subtotal).toLocaleString()}</span>
            </div>
            <div class="fila-total">
                <span>IVA (19%):</span>
                <span>$${Math.round(totales.iva).toLocaleString()}</span>
            </div>
            <div class="fila-total total-final">
                <span>TOTAL:</span>
                <span>$${Math.round(totales.total).toLocaleString()}</span>
            </div>
        </div>

        <div class="ticket-footer">
            <p><strong>GRACIAS POR SU COMPRA</strong></p>
            <p>VUELVA PRONTO</p>
            ${totales.items_con_iva > 0 ? '<p style="font-size: 8px; margin-top: 0.5rem;">* Precios con IVA incluido</p>' : ''}
        </div>
    `;
}

// ============================================
// BOTÓN TICKET - Abre el modal
// ============================================
document.getElementById('imprimir-btn').addEventListener('click', function() {
    const btn = document.getElementById('imprimir-btn');
    const ventaId = btn.dataset.ventaId || ultimaVentaId;

    if (!ventaId) {
        alert('No hay venta para imprimir. Realice una venta primero.');
        return;
    }

    // Cargar datos de la boleta
    fetch(`/obtener_boleta/${ventaId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarTicketModal(data.boleta, data.impresora_detectada);
            } else {
                alert('Error al cargar la boleta');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar la boleta');
        });
});

// ============================================
// IMPRESIÓN DE BOLETA
// ============================================

// Imprimir en impresora térmica
function imprimirBoletaTermica() {
    if (!datosUltimaBoleta) {
        alert('No hay boleta para imprimir');
        return;
    }

    const btn = document.getElementById('btn-imprimir-termica');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Imprimiendo...';
    btn.disabled = true;

    fetch(`/imprimir_boleta/${datosUltimaBoleta.venta_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ ' + data.message);
            // Deshabilitar botón de ticket principal
            document.getElementById('imprimir-btn').disabled = true;
            document.getElementById('imprimir-btn').innerHTML = '<i class="fas fa-check"></i> TICKET';
        } else {
            alert('⚠️ ' + data.message);
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al imprimir');
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

// Imprimir usando impresora del sistema (navegador)
function imprimirBoletaSistema() {
    const contenido = document.getElementById('ticket-contenido');
    const ventanaImpresion = window.open('', '_blank');

    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Boleta ${datosUltimaBoleta ? datosUltimaBoleta.venta_id : ''}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    padding: 20px;
                    max-width: 300px;
                    margin: 0 auto;
                }
                .ticket-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 10px; }
                .ticket-header h2 { font-size: 16px; margin: 0 0 5px 0; }
                .ticket-header p { margin: 2px 0; font-size: 10px; }
                .ticket-info { margin-bottom: 10px; font-size: 10px; }
                .ticket-info p { margin: 2px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 10px; }
                th { border-top: 1px solid #333; border-bottom: 1px solid #333; padding: 3px; text-align: left; }
                td { padding: 3px; border-bottom: 1px dotted #ccc; }
                td:last-child, th:last-child { text-align: right; }
                .unidad-tipo { font-size: 8px; color: #666; }
                .totales { border-top: 1px solid #333; padding-top: 5px; }
                .fila-total { display: flex; justify-content: space-between; margin: 2px 0; }
                .total-final { font-size: 14px; font-weight: bold; border-top: 2px solid #333; border-bottom: 2px solid #333; padding: 5px 0; margin-top: 5px; }
                .footer { text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #333; font-size: 10px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            ${contenido.innerHTML}
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 250);
                };
            <\/script>
        </body>
        </html>
    `);

    ventanaImpresion.document.close();
}

function actualizarCarritoUI(carrito, total) {
    fetch('/carrito_html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('carrito-contenido').innerHTML = html;
            if (total !== null) {
                document.getElementById('total-carrito').innerText = total.toFixed(0);
            }
        })
        .catch(error => console.error('Error:', error));
}

// Activar "Todos" por defecto
document.addEventListener('DOMContentLoaded', function() {
    const btnTodos = document.querySelector('.categoria-btn[data-categoria="todos"]');
    if (btnTodos) {
        btnTodos.classList.add('activa');
    }
});