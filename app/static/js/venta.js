// ============================================
// SISTEMA DE MULTI-CARRITO PARA FRUTERÍA
// (Sin panel de categorías ni teclado, con paginación)
// ============================================

let carritos = [];
let carritoActivo = 0;
let contadorClientes = 1;
let currentSearchQuery = '';
let currentSearchCodigo = '';

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    crearNuevoCarrito();
    inicializarEventos();
});

function inicializarEventos() {
    // Botón nuevo cliente
    document.getElementById('nuevo-cliente-btn').addEventListener('click', function() {
        crearNuevoCarrito();
    });

    // Botón pagar
    document.getElementById('pagar-btn').addEventListener('click', pagar);

    // Botón imprimir
    document.getElementById('imprimir-btn').addEventListener('click', mostrarTicketModal);

    // Buscador por nombre (SE CORRIGE EL ACCESO AL VALOR)
    const inputNombre = document.getElementById('buscador-nombre');
    const inputCodigo = document.getElementById('buscador-codigo');

    inputNombre.addEventListener('input', debounce(function() {
        currentSearchQuery = inputNombre.value;
        currentSearchCodigo = '';
        inputCodigo.value = '';
        cargarProductos(1);
    }, 300));

    // Buscador por código (SE CORRIGE EL ACCESO AL VALOR)
    inputCodigo.addEventListener('input', debounce(function() {
        currentSearchCodigo = inputCodigo.value;
        currentSearchQuery = '';
        inputNombre.value = '';
        cargarProductos(1);
    }, 300));

    // Paginación delegada
    document.getElementById('productos-grid').addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-pagina');
        if (btn && !btn.disabled) {
            const page = parseInt(btn.dataset.page);
            if (page) {
                cargarProductos(page);
            }
        }
    });

    // Modal cantidad
    document.getElementById('confirmar-cantidad').addEventListener('click', confirmarCantidad);
    document.getElementById('cancelar-modal').addEventListener('click', cerrarModalCantidad);
}

function cargarProductos(page = 1) {
    let url = '/buscar_productos?page=' + page;
    if (currentSearchQuery) {
        url += '&q=' + encodeURIComponent(currentSearchQuery);
    } else if (currentSearchCodigo) {
        url += '&codigo=' + encodeURIComponent(currentSearchCodigo);
    }

    fetch(url)
        .then(r => r.text())
        .then(html => {
            document.getElementById('productos-grid').innerHTML = html;
        })
        .catch(err => {
            console.error('Error al cargar productos:', err);
        });
}

function crearNuevoCarrito() {
    const nuevoCarrito = {
        id: Date.now(),
        nombre: `Cliente ${contadorClientes}`,
        items: [],
        horaCreacion: new Date().toLocaleTimeString(),
        total: 0
    };
    
    carritos.push(nuevoCarrito);
    carritoActivo = carritos.length - 1;
    contadorClientes++;
    
    renderizarTabs();
    renderizarCarrito();
    actualizarTotal();
}

function renderizarTabs() {
    const container = document.getElementById('carritos-tabs');
    container.innerHTML = '';
    
    carritos.forEach((carrito, index) => {
        const tab = document.createElement('div');
        tab.className = `carrito-tab ${index === carritoActivo ? 'activo' : ''} ${carrito.items.length > 0 ? 'con-items' : ''}`;
        tab.innerHTML = `
            <span>${carrito.nombre}</span>
            ${carrito.items.length > 0 ? `<span class="contador-items">${carrito.items.length}</span>` : ''}
            ${carritos.length > 1 ? `<button class="btn-cerrar-carrito" onclick="cerrarCarrito(${index}, event)"><i class="fas fa-times"></i></button>` : ''}
        `;
        
        tab.addEventListener('click', function(e) {
            if (!e.target.closest('.btn-cerrar-carrito')) {
                cambiarCarrito(index);
            }
        });
        
        container.appendChild(tab);
    });
}

function cambiarCarrito(index) {
    carritoActivo = index;
    renderizarTabs();
    renderizarCarrito();
    actualizarTotal();
}

function cerrarCarrito(index, event) {
    event.stopPropagation();
    
    if (carritos.length <= 1) {
        mostrarNotificacion('Debe haber al menos un carrito activo', 'error');
        return;
    }
    
    if (carritos[index].items.length > 0 && !confirm('¿Cerrar carrito con items? Se perderán los productos.')) {
        return;
    }
    
    carritos.splice(index, 1);
    
    if (carritoActivo >= carritos.length) {
        carritoActivo = carritos.length - 1;
    }
    
    renderizarTabs();
    renderizarCarrito();
    actualizarTotal();
}

function renderizarCarrito() {
    const carrito = carritos[carritoActivo];
    const container = document.getElementById('carrito-contenido');
    const titulo = document.getElementById('titulo-carrito-actual');
    const hora = document.getElementById('hora-carrito');
    
    titulo.textContent = carrito.nombre;
    hora.textContent = carrito.horaCreacion;
    
    if (carrito.items.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-shopping-basket text-4xl mb-2"></i>
                <p>Carrito vacío</p>
                <small class="text-gray-400">Añade productos para comenzar</small>
            </div>
        `;
        document.getElementById('imprimir-btn').disabled = true;
        return;
    }
    
    let html = `
        <table class="tabla-carrito">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cant</th>
                    <th>Precio</th>
                    <th>Total</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;
    
    carrito.items.forEach((item, index) => {
        const cantidadDisplay = item.cantidad % 1 === 0 ? item.cantidad : item.cantidad.toFixed(2);
        
        html += `
            <tr>
                <td>
                    ${item.nombre}
                    <small style="display: block; color: #64748b; font-size: 0.75rem;">
                        ${item.tipo_unidad === 'kg' ? '<i class="fas fa-weight-hanging"></i> x kg' : '<i class="fas fa-box"></i> unidad'}
                    </small>
                </td>
                <td>
                    <div class="cantidad-control">
                        <button class="cantidad-btn" onclick="actualizarCantidad(${index}, -1)">-</button>
                        <span class="cantidad-valor">${cantidadDisplay}</span>
                        <button class="cantidad-btn" onclick="actualizarCantidad(${index}, 1)">+</button>
                    </div>
                </td>
                <td>
                    <div class="precio-control">
                        <span class="precio-simbolo">$</span>
                        <input type="number" class="precio-input" 
                               value="${Math.round(item.precio)}" 
                               onchange="actualizarPrecio(${index}, this.value)"
                               step="1" min="0">
                    </div>
                </td>
                <td>$${Math.round(item.subtotal)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarItem(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    document.getElementById('imprimir-btn').disabled = false;
}

function actualizarCantidad(index, delta) {
    const carrito = carritos[carritoActivo];
    const item = carrito.items[index];
    
    const nuevaCantidad = item.cantidad + delta;
    
    if (nuevaCantidad <= 0) {
        eliminarItem(index);
        return;
    }
    
    item.cantidad = nuevaCantidad;
    item.subtotal = item.cantidad * item.precio;
    
    renderizarCarrito();
    actualizarTotal();
    renderizarTabs();
}

function actualizarPrecio(index, nuevoPrecio) {
    const carrito = carritos[carritoActivo];
    const item = carrito.items[index];
    
    item.precio = parseFloat(nuevoPrecio);
    item.subtotal = item.cantidad * item.precio;
    
    renderizarCarrito();
    actualizarTotal();
}

function eliminarItem(index) {
    carritos[carritoActivo].items.splice(index, 1);
    renderizarCarrito();
    actualizarTotal();
    renderizarTabs();
}

function actualizarTotal() {
    const carrito = carritos[carritoActivo];
    const total = carrito.items.reduce((sum, item) => sum + item.subtotal, 0);
    carrito.total = total;
    
    document.getElementById('total-carrito').textContent = Math.round(total).toLocaleString();
}

// Agregar producto al carrito
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    
    const id = parseInt(btn.dataset.id);
    const precio = parseFloat(btn.dataset.precio);
    const tipoUnidad = btn.dataset.tipoUnidad;
    const nombre = btn.closest('.producto-card').querySelector('.producto-nombre').textContent;
    
    if (tipoUnidad === 'kg') {
        mostrarModalCantidad(id, nombre, precio, tipoUnidad);
    } else {
        agregarAlCarrito(id, nombre, precio, 1, tipoUnidad);
    }
});

let productoPendiente = null;

function mostrarModalCantidad(id, nombre, precio, tipoUnidad) {
    productoPendiente = { id, nombre, precio, tipoUnidad };
    document.getElementById('cantidad-modal').classList.remove('hidden');
    document.getElementById('cantidad-modal').classList.add('flex');
    document.getElementById('cantidad-input').value = '';
    document.getElementById('cantidad-input').focus();
}

function confirmarCantidad() {
    const cantidad = parseFloat(document.getElementById('cantidad-input').value);
    
    if (!cantidad || cantidad <= 0) {
        mostrarNotificacion('Ingrese una cantidad válida', 'error');
        return;
    }
    
    agregarAlCarrito(
        productoPendiente.id,
        productoPendiente.nombre,
        productoPendiente.precio,
        cantidad,
        productoPendiente.tipoUnidad
    );
    
    cerrarModalCantidad();
}

function cerrarModalCantidad() {
    document.getElementById('cantidad-modal').classList.add('hidden');
    document.getElementById('cantidad-modal').classList.remove('flex');
    productoPendiente = null;
}

function agregarAlCarrito(id, nombre, precio, cantidad, tipoUnidad) {
    const carrito = carritos[carritoActivo];
    
    const existente = carrito.items.find(item => item.producto_id === id);
    
    if (existente) {
        existente.cantidad += cantidad;
        existente.subtotal = existente.cantidad * existente.precio;
    } else {
        carrito.items.push({
            producto_id: id,
            nombre: nombre,
            precio: precio,
            cantidad: cantidad,
            subtotal: precio * cantidad,
            tipo_unidad: tipoUnidad
        });
    }
    
    renderizarCarrito();
    actualizarTotal();
    renderizarTabs();
    mostrarNotificacion(`${nombre} agregado`, 'success');
}

// Pago
function pagar() {
    const carrito = carritos[carritoActivo];
    
    if (carrito.items.length === 0) {
        mostrarNotificacion('Carrito vacío', 'error');
        return;
    }
    
    fetch('/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrito: carrito.items })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            mostrarTicketModal(data.boleta, data.impresora_detectada);
            carrito.items = [];
            renderizarCarrito();
            actualizarTotal();
            renderizarTabs();
        } else {
            mostrarNotificacion(data.error || 'Error en el pago', 'error');
        }
    });
}

// Modal de ticket
function mostrarTicketModal(boletaData, impresoraDetectada) {
    const modal = document.getElementById('ticket-modal');
    const contenido = document.getElementById('ticket-contenido');
    const alertaContainer = document.getElementById('alerta-impresora-container');
    
    let itemsHtml = '';
    boletaData.items.forEach(item => {
        const cant = item.cantidad % 1 === 0 ? item.cantidad : item.cantidad.toFixed(2);
        itemsHtml += `
            <tr>
                <td>${item.nombre}</td>
                <td style="text-align: center;">${cant} ${item.tipo_unidad === 'kg' ? 'kg' : 'un'}</td>
                <td style="text-align: right;">$${Math.round(item.precio)}</td>
            </tr>
        `;
    });
    
    contenido.innerHTML = `
        <div class="ticket-header-fiscal">
            <h2>${boletaData.negocio.nombre}</h2>
            ${boletaData.negocio.direccion ? `<p>${boletaData.negocio.direccion}</p>` : ''}
            ${boletaData.negocio.telefono ? `<p>TEL: ${boletaData.negocio.telefono}</p>` : ''}
            ${boletaData.negocio.rut ? `<p>RUT: ${boletaData.negocio.rut}</p>` : ''}
        </div>
        <div class="ticket-info-fiscal">
            <p><strong>BOLETA N°:</strong> ${String(boletaData.venta_id).padStart(6, '0')}</p>
            <p><strong>FECHA:</strong> ${boletaData.fecha}</p>
            <p><strong>HORA:</strong> ${boletaData.hora}</p>
        </div>
        <table class="ticket-items-fiscal">
            <thead>
                <tr>
                    <th>PRODUCTO</th>
                    <th style="text-align: center;">CANT</th>
                    <th style="text-align: right;">PRECIO</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div class="ticket-totales-fiscal">
            <div class="fila-total-fiscal">
                <span>Subtotal:</span>
                <span>$${Math.round(boletaData.totales.subtotal)}</span>
            </div>
            <div class="fila-total-fiscal">
                <span>IVA (19%):</span>
                <span>$${Math.round(boletaData.totales.iva)}</span>
            </div>
            <div class="fila-total-fiscal total-final-fiscal">
                <span>TOTAL:</span>
                <span>$${Math.round(boletaData.totales.total)}</span>
            </div>
        </div>
        <div class="ticket-iva-fiscal">
            ${boletaData.totales.items_con_iva > 0 ? 'Precios incluyen IVA' : 'IVA incluido en el total'}
        </div>
        <div class="ticket-footer-fiscal">
            <p><strong>GRACIAS POR SU COMPRA</strong></p>
            <p>VUELVA PRONTO</p>
        </div>
    `;
    
    if (!impresoraDetectada) {
        alertaContainer.innerHTML = `
            <div class="alerta-impresora-modal">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No se detectó impresora térmica en COM3</span>
            </div>
        `;
    } else {
        alertaContainer.innerHTML = '';
    }
    
    modal.classList.add('activo');
}

function cerrarTicketModal() {
    document.getElementById('ticket-modal').classList.remove('activo');
}

function imprimirBoletaTermica() {
    mostrarNotificacion('Enviando a impresora térmica...', 'info');
}

function imprimirBoletaSistema() {
    window.print();
}

// Utilidades
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const anterior = document.querySelector('.notificacion-toast');
    if (anterior) anterior.remove();
    
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion-toast ${tipo}`;
    
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    notificacion.innerHTML = `
        <i class="fas ${iconos[tipo] || iconos.info}"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => notificacion.classList.add('mostrar'), 10);
    setTimeout(() => {
        notificacion.classList.remove('mostrar');
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}