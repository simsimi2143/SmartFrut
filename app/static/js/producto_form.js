// app/static/js/producto_form.js

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const cajas = document.getElementById('cajas');
    const unidadesPorCaja = document.getElementById('unidades_por_caja');
    const totalUnidades = document.getElementById('total_unidades');
    const calcularStockBtn = document.getElementById('calcular-stock');
    const costoTotalInput = document.getElementById('costo_total');
    const costoTotalIvaSpan = document.getElementById('costo_total_iva');
    const costoUnitarioSpan = document.getElementById('costo_unitario');
    const costoUnitarioIvaSpan = document.getElementById('costo_unitario_iva');
    const margenInput = document.getElementById('margen');
    const precioCalculadoSpan = document.getElementById('precio_calculado');
    const calcularConIvaBtn = document.getElementById('calcular-con-iva');
    const calcularSinIvaBtn = document.getElementById('calcular-sin-iva');
    const aplicarMargenBtn = document.getElementById('aplicar-margen');
    const precioVentaInput = document.getElementById('precio');
    const ivaIncluidoCheck = document.getElementById('iva_incluido');
    const stockMinimo = document.getElementById('stock_minimo');
    const stockMaximo = document.getElementById('stock_maximo');

    // Campos ocultos para enviar costos unitarios
    const costoUnitarioHidden = document.getElementById('costo_unitario_hidden');
    const costoUnitarioIvaHidden = document.getElementById('costo_unitario_iva_hidden');

    // Función para actualizar total de unidades por cajas
    function actualizarTotalUnidades() {
        const c = parseFloat(cajas.value) || 0;
        const u = parseFloat(unidadesPorCaja.value) || 0;
        const total = c * u;
        totalUnidades.innerText = total.toFixed(2);
    }

    cajas.addEventListener('input', actualizarTotalUnidades);
    unidadesPorCaja.addEventListener('input', actualizarTotalUnidades);

    // Botón "Aplicar ajuste" para stock inicial (simula ajuste)
    calcularStockBtn.addEventListener('click', function() {
        // Aquí podrías sumar al stock actual, pero por ahora solo mostramos mensaje
        const total = parseFloat(totalUnidades.innerText) || 0;
        if (total > 0) {
            alert(`Se agregarán ${total} unidades al stock. Funcionalidad a implementar.`);
            // Si tuvieramos un campo de stock_actual, podríamos actualizarlo
        } else {
            alert('Ingresa cantidad de cajas y unidades por caja');
        }
    });

    // Función para calcular costos unitarios a partir del costo total
    function calcularCostosUnitarios() {
        const costoTotal = parseFloat(costoTotalInput.value) || 0;
        const totalUnid = parseFloat(totalUnidades.innerText) || 1; // Evitar división por cero
        const costoUnit = costoTotal / totalUnid;
        costoUnitarioSpan.innerText = costoUnit.toFixed(2);
        costoUnitarioHidden.value = costoUnit.toFixed(2);

        // Suponemos IVA del 19% (ajusta según tu país)
        const IVA = 0.19;
        const costoUnitIva = costoUnit * (1 + IVA);
        costoUnitarioIvaSpan.innerText = costoUnitIva.toFixed(2);
        costoUnitarioIvaHidden.value = costoUnitIva.toFixed(2);

        // Costo total con IVA
        costoTotalIvaSpan.innerText = (costoTotal * (1 + IVA)).toFixed(2);
    }

    costoTotalInput.addEventListener('input', calcularCostosUnitarios);
    // También recalcular si cambia el total de unidades
    calcularStockBtn.addEventListener('click', function() {
        // Después de ajustar stock, recalcular costos unitarios (si hay costo total)
        calcularCostosUnitarios();
    });

    // Calcular precio según margen
    function calcularPrecio(conIva) {
        const costoUnit = conIva ? parseFloat(costoUnitarioIvaSpan.innerText) : parseFloat(costoUnitarioSpan.innerText);
        const margen = parseFloat(margenInput.value) || 0;
        if (costoUnit > 0) {
            const precio = costoUnit * (1 + margen / 100);
            precioCalculadoSpan.innerText = precio.toFixed(2);
        } else {
            precioCalculadoSpan.innerText = '0';
        }
    }

    calcularConIvaBtn.addEventListener('click', function() {
        calcularPrecio(true);
    });

    calcularSinIvaBtn.addEventListener('click', function() {
        calcularPrecio(false);
    });

    aplicarMargenBtn.addEventListener('click', function() {
        const precio = parseFloat(precioCalculadoSpan.innerText);
        if (!isNaN(precio) && precio > 0) {
            precioVentaInput.value = precio.toFixed(2);
        } else {
            alert('Primero calcula un precio');
        }
    });

    // Si hay valores iniciales (edición), calcular los costos unitarios al cargar
    if (costoTotalInput.value) {
        calcularCostosUnitarios();
    }
});