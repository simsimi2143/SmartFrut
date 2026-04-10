// ============================================
// SmartFrut - Punto de Venta JavaScript (CORREGIDO CON IVA DESGLOSADO)
// ============================================

// Variables globales
let productoSeleccionado = null;
let inputBuffer = '';
const IVA_TASA = 0.19; // 19% IVA Chile

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarEventListeners();
    inicializarTeclado();
    inicializarEventDelegation();
    actualizarTotal();
});

function inicializarEventListeners() {
    // Filtro de categorías
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('activa'));
            this.classList.add('activa');
            const categoriaId = this.dataset.categoria;
            filtrarProductos(categoriaId);
        });
    });

    // Buscador por nombre
    const buscadorNombre = document.getElementById('buscador-nombre');
    if (buscadorNombre) {
        buscadorNombre.addEventListener('input', debounce(function(e) {
            const query = e.target.value;
            const categoriaActiva = document.querySelector('.categoria-btn.activa')?.dataset.categoria;
            const buscadorCodigo = document.getElementById('buscador-codigo');
            if (query.length > 0 && buscadorCodigo) buscadorCodigo.value = '';
            buscarProductos(query, null, categoriaActiva);
        }, 300));
    }

    // Buscador por código
    const buscadorCodigo = document.getElementById('buscador-codigo');
    if (buscadorCodigo) {
        buscadorCodigo.addEventListener('input', debounce(function(e) {
            const codigo = e.target.value;
            const categoriaActiva = document.querySelector('.categoria-btn.activa')?.dataset.categoria;
            const buscadorNombre = document.getElementById('buscador-nombre');
            if (codigo.length > 0 && buscadorNombre) buscadorNombre.value = '';
            buscarProductos(null, codigo, categoriaActiva);
        }, 200));

        buscadorCodigo.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const primerProducto = document.querySelector('.producto-card');
                if (primerProducto) {
                    const id = primerProducto.dataset.id;
                    const precio = parseFloat(primerProducto.dataset.precio);
                    const nombre = primerProducto.querySelector('.producto-nombre')?.textContent || '';
                    const tipoUnidad = primerProducto.dataset.tipoUnidad || 'unidad';

                    if (tipoUnidad === 'kg') {
                        mostrarModalCantidad(id, precio, nombre);
                    } else {
                        agregarAlCarrito(id, 1, precio);
                    }
                    this.value = '';
                    this.focus();
                }
            }
        });
    }

    // Botón pagar
    const btnPagar = document.getElementById('pagar-btn');
    if (btnPagar) btnPagar.addEventListener('click', procesarPago);

    // Botón imprimir
    const btnImprimir = document.getElementById('imprimir-btn');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            const ventaId = this.dataset.ventaId;
            if (ventaId) mostrarTicketModal(ventaId);
        });
    }

    // Modal de cantidad
    const btnConfirmarCantidad = document.getElementById('confirmar-cantidad');
    if (btnConfirmarCantidad) btnConfirmarCantidad.addEventListener('click', confirmarCantidad);

    const btnCancelarModal = document.getElementById('cancelar-modal');
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalCantidad);

    const cantidadModal = document.getElementById('cantidad-modal');
    if (cantidadModal) {
        cantidadModal.addEventListener('click', function(e) {
            if (e.target === this) cerrarModalCantidad();
        });
    }
}

// ============================================
// EVENT DELEGATION
// ============================================

function inicializarEventDelegation() {
    const productosGrid = document.getElementById('productos-grid');
    if (productosGrid) {
        productosGrid.addEventListener('click', function(e) {
            const btnAgregar = e.target.closest('.add-to-cart');
            const card = e.target.closest('.producto-card');

            if (btnAgregar) {
                e.stopPropagation();
                const id = btnAgregar.dataset.id;
                const precio = parseFloat(btnAgregar.dataset.precio);
                const tipoUnidad = btnAgregar.dataset.tipoUnidad || 'unidad';
                const nombreCard = btnAgregar.closest('.producto-card')?.querySelector('.producto-nombre')?.textContent || '';

                if (tipoUnidad === 'kg') {
                    mostrarModalCantidad(id, precio, nombreCard);
                } else {
                    agregarAlCarrito(id, 1, precio);
                }
            } else if (card && !e.target.closest('.btn-agregar')) {
                const id = card.dataset.id;
                const precio = parseFloat(card.dataset.precio);
                const nombre = card.querySelector('.producto-nombre')?.textContent || '';
                const tipoUnidad = card.dataset.tipoUnidad || 'unidad';

                if (tipoUnidad === 'kg') {
                    mostrarModalCantidad(id, precio, nombre);
                } else {
                    agregarAlCarrito(id, 1, precio);
                }
            }
        });
    }

    const carritoContenido = document.getElementById('carrito-contenido');
    if (carritoContenido) {
        carritoContenido.addEventListener('click', function(e) {
            const btnCantidad = e.target.closest('.update-cantidad');
            if (btnCantidad) {
                const id = btnCantidad.dataset.id;
                const cantidad = parseFloat(btnCantidad.dataset.cantidad);
                if (cantidad <= 0) eliminarDelCarrito(id);
                else actualizarCantidad(id, cantidad);
                return;
            }

            const btnEliminar = e.target.closest('.remove-item');
            if (btnEliminar) {
                const id = btnEliminar.dataset.id;
                if (confirm('¿Eliminar este producto del carrito?')) eliminarDelCarrito(id);
                return;
            }
        });

        carritoContenido.addEventListener('change', function(e) {
            const inputPrecio = e.target.closest('.update-precio');
            if (inputPrecio) {
                const id = inputPrecio.dataset.id;
                const nuevoPrecio = parseFloat(inputPrecio.value);
                if (nuevoPrecio < 0) {
                    alert('El precio no puede ser negativo');
                    inputPrecio.value = inputPrecio.dataset.precioOriginal || 0;
                    return;
                }
                actualizarPrecio(id, nuevoPrecio);
            }
        });
    }
}

// ============================================
// BÚSQUEDA Y FILTRADO
// ============================================

function filtrarProductos(categoriaId) {
    let url = '/filtrar_productos?';
    if (categoriaId && categoriaId !== 'todos') url += `categoria_id=${categoriaId}`;

    fetch(url)
        .then(r => r.text())
        .then(html => document.getElementById('productos-grid').innerHTML = html)
        .catch(err => console.error('Error al filtrar:', err));
}

function buscarProductos(nombre, codigo, categoriaId) {
    let url = '/buscar_productos?';
    const params = [];
    if (nombre) params.push(`q=${encodeURIComponent(nombre)}`);
    if (codigo) params.push(`codigo=${encodeURIComponent(codigo)}`);
    if (categoriaId && categoriaId !== 'todos') params.push(`categoria_id=${categoriaId}`);
    url += params.join('&');

    fetch(url)
        .then(r => r.text())
        .then(html => document.getElementById('productos-grid').innerHTML = html)
        .catch(err => console.error('Error al buscar:', err));
}

// ============================================
// CARRITO
// ============================================

function mostrarModalCantidad(productoId, precio, nombre) {
    productoSeleccionado = { id: productoId, precio: precio, nombre: nombre };
    const modal = document.getElementById('cantidad-modal');
    const input = document.getElementById('cantidad-input');

    if (modal && input) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        input.value = '';
        input.placeholder = `Kg de ${nombre}`;
        input.focus();
    }
}

function cerrarModalCantidad() {
    const modal = document.getElementById('cantidad-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    productoSeleccionado = null;
}

function confirmarCantidad() {
    const input = document.getElementById('cantidad-input');
    const cantidad = parseFloat(input.value);

    if (!cantidad || cantidad <= 0) {
        alert('Por favor ingrese una cantidad válida');
        return;
    }

    if (productoSeleccionado) {
        agregarAlCarrito(productoSeleccionado.id, cantidad, productoSeleccionado.precio);
        cerrarModalCantidad();
    }
}

function agregarAlCarrito(productoId, cantidad, precio) {
    fetch('/agregar_al_carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: productoId, cantidad: cantidad, precio: precio })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) { alert(data.error); return; }
        actualizarCarritoUI(data);
    })
    .catch(err => console.error('Error al agregar:', err));
}

function actualizarCarritoUI(data) {
    fetch('/carrito_html')
        .then(r => r.text())
        .then(html => {
            document.getElementById('carrito-contenido').innerHTML = html;
            document.getElementById('total-carrito').textContent = formatearPrecio(data.total);
            document.querySelectorAll('.update-precio').forEach(input => {
                input.dataset.precioOriginal = input.value;
            });
        });
}

function actualizarCantidad(productoId, cantidad) {
    fetch('/actualizar_carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: productoId, cantidad: cantidad })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) { alert(data.error); return; }
        actualizarCarritoUI(data);
    })
    .catch(err => console.error('Error al actualizar cantidad:', err));
}

function actualizarPrecio(productoId, precio) {
    fetch('/actualizar_precio_carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: productoId, precio: precio })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) { alert(data.error); return; }
        actualizarCarritoUI(data);
    })
    .catch(err => console.error('Error al actualizar precio:', err));
}

function eliminarDelCarrito(productoId) {
    fetch('/actualizar_carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: productoId, cantidad: 0 })
    })
    .then(r => r.json())
    .then(data => actualizarCarritoUI(data))
    .catch(err => console.error('Error al eliminar:', err));
}

// ============================================
// TECLADO NUMÉRICO
// ============================================

function inicializarTeclado() {
    const teclado = document.getElementById('teclado');
    if (!teclado) return;

    teclado.addEventListener('click', function(e) {
        if (e.target.classList.contains('num-key')) {
            const key = e.target.textContent;
            if (key === 'C') inputBuffer = '';
            else inputBuffer += key;
            console.log('Buffer:', inputBuffer);
        }
    });
}

// ============================================
// PAGO Y TICKET CON IVA DESGLOSADO
// ============================================

function procesarPago() {
    const totalElement = document.getElementById('total-carrito');
    const total = parseFloat(totalElement.textContent.replace(/[^\d.-]/g, ''));

    if (total <= 0) { alert('No hay productos en el carrito'); return; }
    if (!confirm(`¿Confirmar venta por $${formatearPrecio(total)}?`)) return;

    fetch('/pagar', { method: 'POST', headers: { 'Content-Type': 'application/json' }})
    .then(r => r.json())
    .then(data => {
        if (data.error) { alert(data.error); return; }

        const btnImprimir = document.getElementById('imprimir-btn');
        if (btnImprimir) {
            btnImprimir.disabled = false;
            btnImprimir.dataset.ventaId = data.venta_id;
        }

        mostrarTicketModal(data.venta_id, data.boleta, data.impresora_detectada);

        document.getElementById('carrito-contenido').innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-shopping-basket text-4xl mb-2"></i>
                <p>Carrito vacío</p>
            </div>`;
        document.getElementById('total-carrito').textContent = '0';

        const buscadorNombre = document.getElementById('buscador-nombre');
        const buscadorCodigo = document.getElementById('buscador-codigo');
        if (buscadorNombre) buscadorNombre.value = '';
        if (buscadorCodigo) buscadorCodigo.value = '';
    })
    .catch(err => {
        console.error('Error al procesar pago:', err);
        alert('Error al procesar el pago');
    });
}

// ============================================
// MODAL DEL TICKET CON IVA DESGLOSADO
// ============================================

function mostrarTicketModal(ventaId, boletaData = null, impresoraDetectada = false) {
    const modal = document.getElementById('ticket-modal');

    if (boletaData) {
        renderizarTicket(boletaData, impresoraDetectada);
    } else {
        fetch(`/obtener_boleta/${ventaId}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) renderizarTicket(data.boleta, data.impresora_detectada);
            });
    }

    if (modal) modal.classList.add('activo');
}

function renderizarTicket(boleta, impresoraDetectada) {
    const contenedor = document.getElementById('ticket-contenido');
    const alertaContainer = document.getElementById('alerta-impresora-container');

    if (!impresoraDetectada && alertaContainer) {
        alertaContainer.innerHTML = `
            <div class="alerta-impresora-modal">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No se detectó impresora térmica en COM3</span>
            </div>`;
    } else if (alertaContainer) alertaContainer.innerHTML = '';

    // Calcular totales con IVA desglosado
    let itemsHtml = '';
    let totalNeto = 0;
    let totalIVA = 0;

    boleta.items.forEach(item => {
        const cantidad = item.cantidad === Math.floor(item.cantidad) ? item.cantidad : item.cantidad.toFixed(2);
        const unidad = item.tipo_unidad === 'kg' ? 'kg' : 'un';

        // Calcular IVA para este ítem
        let precioNeto, ivaItem, subtotalNeto;
        if (item.iva_incluido) {
            precioNeto = item.precio / (1 + IVA_TASA);
            ivaItem = item.precio - precioNeto;
            subtotalNeto = item.subtotal / (1 + IVA_TASA);
        } else {
            precioNeto = item.precio;
            ivaItem = item.precio * IVA_TASA;
            subtotalNeto = item.subtotal;
        }

        totalNeto += subtotalNeto;
        totalIVA += (item.subtotal - subtotalNeto);

        itemsHtml += `
            <tr>
                <td class="text-center">${cantidad}</td>
                <td>${item.nombre}</td>
                <td class="text-right">$${Math.round(item.precio)}</td>
                <td class="text-right">$${Math.round(item.subtotal)}</td>
            </tr>`;
    });

    const fecha = typeof boleta.fecha === 'string' ? boleta.fecha : new Date(boleta.fecha).toLocaleDateString('es-CL');
    const hora = boleta.hora || new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});

    // Formato tipo boleta fiscal chilena
    contenedor.innerHTML = `
        <div class="ticket-header-fiscal">
            <h2>${boleta.negocio.nombre}</h2>
            ${boleta.negocio.direccion ? `<p>${boleta.negocio.direccion}</p>` : ''}
            ${boleta.negocio.telefono ? `<p>TEL: ${boleta.negocio.telefono}</p>` : ''}
            ${boleta.negocio.rut ? `<p>R.U.T.: ${boleta.negocio.rut}</p>` : ''}
        </div>

        <div class="ticket-info-fiscal">
            <p><strong>BOLETA ELECTRÓNICA Nro.:</strong> ${String(boleta.venta_id).padStart(6, '0')}</p>
            <p><strong>Fecha de emisión:</strong> ${fecha}</p>
            <p><strong>Hora:</strong> ${hora}</p>
            <p><strong>CAJA:</strong> 0001</p>
        </div>

        <table class="ticket-items-fiscal">
            <thead>
                <tr>
                    <th class="text-center">Ctd.</th>
                    <th>Descripción</th>
                    <th class="text-right">Precio</th>
                    <th class="text-right">Subt.</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="ticket-totales-fiscal">
            <div class="fila-total-fiscal total-final-fiscal">
                <span>TOTAL</span>
                <span>$${Math.round(boleta.totales.total).toLocaleString('es-CL')}</span>
            </div>
            <div class="fila-total-fiscal">
                <span>EFECTIVO</span>
                <span>$${Math.round(boleta.totales.total).toLocaleString('es-CL')}</span>
            </div>
        </div>

        <div class="ticket-iva-fiscal">
            <p>El iva de esta boleta es $ ${Math.round(totalIVA).toLocaleString('es-CL')}</p>
        </div>

        <div class="ticket-footer-fiscal">
            <p><strong>GRACIAS POR SU COMPRA</strong></p>
            <p>VUELVA PRONTO</p>
        </div>
    `;

    const btnImprimirTermica = document.getElementById('btn-imprimir-termica');
    if (btnImprimirTermica) btnImprimirTermica.dataset.ventaId = boleta.venta_id;
}

function cerrarTicketModal() {
    const modal = document.getElementById('ticket-modal');
    if (modal) modal.classList.remove('activo');
}

function imprimirBoletaTermica() {
    const ventaId = document.getElementById('btn-imprimir-termica')?.dataset.ventaId;
    if (!ventaId) return;

    fetch(`/imprimir_boleta/${ventaId}`, { method: 'POST' })
    .then(r => r.json())
    .then(data => {
        if (data.success) alert('Boleta enviada a impresora térmica');
        else alert(data.message || 'Error al imprimir');
    })
    .catch(err => {
        console.error('Error al imprimir:', err);
        alert('Error de conexión con la impresora');
    });
}

function imprimirBoletaSistema() {
    window.print();
}

// ============================================
// UTILIDADES
// ============================================

function formatearPrecio(valor) {
    return Math.round(valor).toLocaleString('es-CL');
}

function actualizarTotal() {
    fetch('/carrito_html')
        .then(r => r.text())
        .then(() => {});
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalCantidad();
        cerrarTicketModal();
    }
});