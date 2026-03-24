// ============================================
// SmartFrut - Punto de Venta JavaScript
// ============================================

// Variables globales
let productoSeleccionado = null;
let inputBuffer = '';

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarEventListeners();
    inicializarTeclado();
    actualizarTotal();
});

function inicializarEventListeners() {
    // Filtro de categorías
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover clase activa de todos
            document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('activa'));
            // Agregar clase activa al clickeado
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
            
            // Limpiar buscador de código si se escribe en nombre
            const buscadorCodigo = document.getElementById('buscador-codigo');
            if (query.length > 0 && buscadorCodigo) {
                buscadorCodigo.value = '';
            }
            
            buscarProductos(query, null, categoriaActiva);
        }, 300));
    }

    // Buscador por código
    const buscadorCodigo = document.getElementById('buscador-codigo');
    if (buscadorCodigo) {
        buscadorCodigo.addEventListener('input', debounce(function(e) {
            const codigo = e.target.value;
            const categoriaActiva = document.querySelector('.categoria-btn.activa')?.dataset.categoria;
            
            // Limpiar buscador de nombre si se escribe en código
            const buscadorNombre = document.getElementById('buscador-nombre');
            if (codigo.length > 0 && buscadorNombre) {
                buscadorNombre.value = '';
            }
            
            buscarProductos(null, codigo, categoriaActiva);
        }, 200));

        // Enter para agregar rápido el primer producto
        buscadorCodigo.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const primerProducto = document.querySelector('.producto-card');
                if (primerProducto) {
                    const id = primerProducto.dataset.id;
                    const precio = parseFloat(primerProducto.dataset.precio);
                    const nombre = primerProducto.querySelector('.producto-nombre')?.textContent || '';
                    
                    // Verificar si es producto por kg o unidad
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
    if (btnPagar) {
        btnPagar.addEventListener('click', procesarPago);
    }

    // Botón imprimir (deshabilitado por defecto hasta que haya venta)
    const btnImprimir = document.getElementById('imprimir-btn');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            const ventaId = this.dataset.ventaId;
            if (ventaId) {
                mostrarTicketModal(ventaId);
            }
        });
    }

    // Modal de cantidad
    const btnConfirmarCantidad = document.getElementById('confirmar-cantidad');
    if (btnConfirmarCantidad) {
        btnConfirmarCantidad.addEventListener('click', confirmarCantidad);
    }

    const btnCancelarModal = document.getElementById('cancelar-modal');
    if (btnCancelarModal) {
        btnCancelarModal.addEventListener('click', cerrarModalCantidad);
    }

    // Cerrar modal al hacer clic fuera
    const cantidadModal = document.getElementById('cantidad-modal');
    if (cantidadModal) {
        cantidadModal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalCantidad();
            }
        });
    }
}

// ============================================
// BÚSQUEDA Y FILTRADO
// ============================================

function filtrarProductos(categoriaId) {
    let url = '/filtrar_productos?';
    if (categoriaId && categoriaId !== 'todos') {
        url += `categoria_id=${categoriaId}`;
    }
    
    fetch(url)
        .then(r => r.text())
        .then(html => {
            document.getElementById('productos-grid').innerHTML = html;
            rebindAddToCart();
        })
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
        .then(html => {
            document.getElementById('productos-grid').innerHTML = html;
            rebindAddToCart();
        })
        .catch(err => console.error('Error al buscar:', err));
}

// ============================================
// CARRITO - AGREGAR/ACTUALIZAR/ELIMINAR
// ============================================

function rebindAddToCart() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const precio = parseFloat(this.dataset.precio);
            const card = this.closest('.producto-card');
            const nombre = card?.querySelector('.producto-nombre')?.textContent || '';
            const tipoUnidad = card?.dataset.tipoUnidad || 'unidad';
            
            if (tipoUnidad === 'kg') {
                mostrarModalCantidad(id, precio, nombre);
            } else {
                agregarAlCarrito(id, 1, precio);
            }
        });
    });

    // También permitir clic en toda la card
    document.querySelectorAll('.producto-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.btn-agregar')) return;
            
            const id = this.dataset.id;
            const precio = parseFloat(this.dataset.precio);
            const nombre = this.querySelector('.producto-nombre')?.textContent || '';
            const tipoUnidad = this.dataset.tipoUnidad || 'unidad';
            
            if (tipoUnidad === 'kg') {
                mostrarModalCantidad(id, precio, nombre);
            } else {
                agregarAlCarrito(id, 1, precio);
            }
        });
    });
}

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
        body: JSON.stringify({
            producto_id: productoId,
            cantidad: cantidad,
            precio: precio
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
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
            
            // Re-bind eventos del carrito
            rebindCarritoEvents();
        });
}

function rebindCarritoEvents() {
    // Botones de cantidad (+/-)
    document.querySelectorAll('.update-cantidad').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const cantidad = parseFloat(this.dataset.cantidad);
            
            if (cantidad <= 0) {
                eliminarDelCarrito(id);
            } else {
                actualizarCantidad(id, cantidad);
            }
        });
    });

    // Inputs de precio editables
    document.querySelectorAll('.update-precio').forEach(input => {
        input.addEventListener('change', function() {
            const id = this.dataset.id;
            const nuevoPrecio = parseFloat(this.value);
            
            if (nuevoPrecio < 0) {
                alert('El precio no puede ser negativo');
                this.value = this.dataset.precioOriginal || 0;
                return;
            }
            
            actualizarPrecio(id, nuevoPrecio);
        });
        
        // Guardar precio original para restaurar si hay error
        input.dataset.precioOriginal = input.value;
    });

    // Botones eliminar
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            if (confirm('¿Eliminar este producto del carrito?')) {
                eliminarDelCarrito(id);
            }
        });
    });
}

function actualizarCantidad(productoId, cantidad) {
    fetch('/actualizar_carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            producto_id: productoId,
            cantidad: cantidad
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        actualizarCarritoUI(data);
    })
    .catch(err => console.error('Error al actualizar cantidad:', err));
}

function actualizarPrecio(productoId, precio) {
    fetch('/actualizar_precio_carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            producto_id: productoId,
            precio: precio
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        actualizarCarritoUI(data);
    })
    .catch(err => console.error('Error al actualizar precio:', err));
}

function eliminarDelCarrito(productoId) {
    fetch('/actualizar_carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            producto_id: productoId,
            cantidad: 0
        })
    })
    .then(r => r.json())
    .then(data => {
        actualizarCarritoUI(data);
    })
    .catch(err => console.error('Error al eliminar:', err));
}

// ============================================
// TECLADO NUMÉRICO VIRTUAL
// ============================================

function inicializarTeclado() {
    const teclado = document.getElementById('teclado');
    if (!teclado) return;

    teclado.addEventListener('click', function(e) {
        if (e.target.classList.contains('num-key')) {
            const key = e.target.textContent;
            
            if (key === 'C') {
                inputBuffer = '';
            } else {
                inputBuffer += key;
            }
            
            // Aquí puedes implementar lógica adicional para el buffer
            console.log('Buffer:', inputBuffer);
        }
    });
}

// ============================================
// PAGO Y TICKET
// ============================================

function procesarPago() {
    const totalElement = document.getElementById('total-carrito');
    const total = parseFloat(totalElement.textContent.replace(/[^\d.-]/g, ''));
    
    if (total <= 0) {
        alert('No hay productos en el carrito');
        return;
    }

    if (!confirm(`¿Confirmar venta por $${formatearPrecio(total)}?`)) {
        return;
    }

    fetch('/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        
        // Habilitar botón de imprimir
        const btnImprimir = document.getElementById('imprimir-btn');
        if (btnImprimir) {
            btnImprimir.disabled = false;
            btnImprimir.dataset.ventaId = data.venta_id;
        }
        
        // Mostrar modal del ticket
        mostrarTicketModal(data.venta_id, data.boleta, data.impresora_detectada);
        
        // Limpiar carrito visualmente
        document.getElementById('carrito-contenido').innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-shopping-basket text-4xl mb-2"></i>
                <p>Carrito vacío</p>
            </div>
        `;
        document.getElementById('total-carrito').textContent = '0';
        
        // Limpiar buscadores
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
// MODAL DEL TICKET
// ============================================

function mostrarTicketModal(ventaId, boletaData = null, impresoraDetectada = false) {
    const modal = document.getElementById('ticket-modal');
    
    if (boletaData) {
        renderizarTicket(boletaData, impresoraDetectada);
    } else {
        // Obtener datos de la boleta
        fetch(`/obtener_boleta/${ventaId}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    renderizarTicket(data.boleta, data.impresora_detectada);
                }
            });
    }
    
    if (modal) {
        modal.classList.add('activo');
    }
}

function renderizarTicket(boleta, impresoraDetectada) {
    const contenedor = document.getElementById('ticket-contenido');
    const alertaContainer = document.getElementById('alerta-impresora-container');
    
    // Mostrar alerta si no hay impresora
    if (!impresoraDetectada && alertaContainer) {
        alertaContainer.innerHTML = `
            <div class="alerta-impresora-modal">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No se detectó impresora térmica en COM3</span>
            </div>
        `;
    } else if (alertaContainer) {
        alertaContainer.innerHTML = '';
    }
    
    // Generar HTML del ticket
    let itemsHtml = '';
    boleta.items.forEach(item => {
        const cantidad = item.cantidad === Math.floor(item.cantidad) 
            ? item.cantidad 
            : item.cantidad.toFixed(2);
        const unidad = item.tipo_unidad === 'kg' ? 'kg' : 'un';
        
        itemsHtml += `
            <tr>
                <td>${item.nombre}<br><span class="unidad-tipo">(${cantidad} ${unidad} x $${Math.round(item.precio)})</span></td>
                <td>$${Math.round(item.subtotal)}</td>
            </tr>
        `;
    });
    
    const fecha = typeof boleta.fecha === 'string' ? boleta.fecha : new Date(boleta.fecha).toLocaleDateString('es-CL');
    const hora = boleta.hora || new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
    
    contenedor.innerHTML = `
        <div class="ticket-header">
            <h2>${boleta.negocio.nombre}</h2>
            ${boleta.negocio.direccion ? `<p>${boleta.negocio.direccion}</p>` : ''}
            ${boleta.negocio.telefono ? `<p>TEL: ${boleta.negocio.telefono}</p>` : ''}
            ${boleta.negocio.rut ? `<p>RUT: ${boleta.negocio.rut}</p>` : ''}
        </div>
        
        <div class="ticket-info">
            <p><strong>BOLETA N°:</strong> ${String(boleta.venta_id).padStart(6, '0')}</p>
            <p><strong>FECHA:</strong> ${fecha}</p>
            <p><strong>HORA:</strong> ${hora}</p>
        </div>
        
        <table class="ticket-items">
            <thead>
                <tr>
                    <th>PRODUCTO</th>
                    <th style="text-align: right;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div class="ticket-totales">
            <div class="fila-total">
                <span>Subtotal:</span>
                <span>$${Math.round(boleta.totales.subtotal)}</span>
            </div>
            <div class="fila-total">
                <span>IVA (19%):</span>
                <span>$${Math.round(boleta.totales.iva)}</span>
            </div>
            <div class="fila-total total-final">
                <span>TOTAL:</span>
                <span>$${Math.round(boleta.totales.total)}</span>
            </div>
        </div>
        
        <div class="ticket-footer">
            <p><strong>GRACIAS POR SU COMPRA</strong></p>
            <p>VUELVA PRONTO</p>
        </div>
    `;
    
    // Guardar venta_id para reimpresión
    const btnImprimirTermica = document.getElementById('btn-imprimir-termica');
    if (btnImprimirTermica) {
        btnImprimirTermica.dataset.ventaId = boleta.venta_id;
    }
}

function cerrarTicketModal() {
    const modal = document.getElementById('ticket-modal');
    if (modal) {
        modal.classList.remove('activo');
    }
}

function imprimirBoletaTermica() {
    const ventaId = document.getElementById('btn-imprimir-termica')?.dataset.ventaId;
    if (!ventaId) return;
    
    fetch(`/imprimir_boleta/${ventaId}`, {
        method: 'POST'
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert('Boleta enviada a impresora térmica');
        } else {
            alert(data.message || 'Error al imprimir');
        }
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
    // Obtener total actual del servidor al cargar
    fetch('/carrito_html')
        .then(r => r.text())
        .then(() => {
            // El total se actualiza en el HTML parcial
        });
}

// Debounce para evitar múltiples llamadas
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

// Cerrar modales con Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalCantidad();
        cerrarTicketModal();
    }
});