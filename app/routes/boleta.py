"""
Módulo de impresión de boletas para frutería
Maneja la impresión en impresora térmica conectada al puerto COM3
y proporciona vista previa cuando no hay impresora disponible.
"""

import serial
import serial.tools.list_ports
from datetime import datetime
import textwrap

# Configuración de la impresora
PRINTER_PORT = 'COM3'
PRINTER_BAUDRATE = 9600
PRINTER_TIMEOUT = 5

# Comandos ESC/POS para impresoras térmicas
ESC = chr(27)
GS = chr(29)
ALIGN_CENTER = ESC + 'a' + chr(1)
ALIGN_LEFT = ESC + 'a' + chr(0)
ALIGN_RIGHT = ESC + 'a' + chr(2)
BOLD_ON = ESC + 'E' + chr(1)
BOLD_OFF = ESC + 'E' + chr(0)
DOUBLE_WIDTH = GS + '!' + chr(16)
DOUBLE_HEIGHT = GS + '!' + chr(1)
NORMAL_SIZE = GS + '!' + chr(0)
CUT_PAPER = GS + 'V' + chr(1)
LINE_FEED = chr(10)


def detectar_impresora():
    """
    Detecta si hay una impresora conectada al puerto COM3.

    Returns:
        bool: True si la impresora está disponible, False en caso contrario
    """
    try:
        # Verificar si el puerto COM3 existe
        puertos = [p.device for p in serial.tools.list_ports.comports()]
        if PRINTER_PORT not in puertos:
            return False

        # Intentar conectar
        with serial.Serial(PRINTER_PORT, PRINTER_BAUDRATE, timeout=PRINTER_TIMEOUT) as ser:
            return ser.is_open
    except Exception:
        return False


def formatear_boleta(datos_venta):
    """
    Formatea los datos de la venta en un texto de boleta legible.

    Args:
        datos_venta: Diccionario con los datos de la venta

    Returns:
        str: Texto formateado de la boleta
    """
    negocio = datos_venta.get('negocio', {
        'nombre': 'FRUTERIA',
        'direccion': '',
        'telefono': '',
        'rut': ''
    })

    fecha = datos_venta.get('fecha', datetime.now())
    items = datos_venta.get('items', [])
    total = datos_venta.get('total', 0)
    subtotal = datos_venta.get('subtotal', total / 1.19)
    iva = datos_venta.get('iva', total - subtotal)
    venta_id = datos_venta.get('id', 0)

    lineas = []

    # Encabezado centrado
    lineas.append('=' * 40)
    lineas.append(negocio['nombre'].center(40))
    if negocio.get('direccion'):
        lineas.append(negocio['direccion'].center(40))
    if negocio.get('telefono'):
        lineas.append(f"TEL: {negocio['telefono']}".center(40))
    if negocio.get('rut'):
        lineas.append(f"RUT: {negocio['rut']}".center(40))
    lineas.append('=' * 40)

    # Información de la venta
    lineas.append('')
    lineas.append(f"BOLETA N°: {venta_id:06d}")
    if isinstance(fecha, datetime):
        lineas.append(f"FECHA: {fecha.strftime('%d/%m/%Y')}")
        lineas.append(f"HORA: {fecha.strftime('%H:%M:%S')}")
    else:
        lineas.append(f"FECHA: {fecha}")
    lineas.append('-' * 40)

    # Cabecera de productos
    lineas.append(f"{'PRODUCTO':<16} {'UND':>4} {'CANT':>6} {'PRECIO':>10}")
    lineas.append('-' * 40)

    # Productos
    for item in items:
        nombre = item['nombre'][:14]
        cantidad = item['cantidad']
        precio = item['precio']
        tipo_unidad = item.get('tipo_unidad', 'unidad')
        unidad_str = 'kg' if tipo_unidad == 'kg' else 'un'

        # Si la cantidad es entera, mostrar sin decimales
        if cantidad == int(cantidad):
            cant_str = f"{int(cantidad)}"
        else:
            cant_str = f"{cantidad:.2f}"

        lineas.append(f"{nombre:<16} {unidad_str:>4} {cant_str:>6} ${precio:>8.0f}")

    lineas.append('-' * 40)

    # Totales con IVA
    lineas.append('')
    lineas.append(f"{'Subtotal:':<25} ${subtotal:>12.0f}")
    lineas.append(f"{'IVA (19%):':<25} ${iva:>12.0f}")
    lineas.append(f"{'TOTAL:':<25} ${total:>12.0f}")
    lineas.append('')

    # Pie de boleta
    lineas.append('=' * 40)
    lineas.append('GRACIAS POR SU COMPRA'.center(40))
    lineas.append('VUELVA PRONTO'.center(40))
    lineas.append('=' * 40)
    lineas.append('')
    lineas.append('')
    lineas.append('')

    return '\n'.join(lineas)


def formatear_boleta_escpos(datos_venta):
    """
    Formatea la boleta con comandos ESC/POS para impresoras térmicas.

    Args:
        datos_venta: Diccionario con los datos de la venta

    Returns:
        bytes: Comandos ESC/POS listos para enviar a la impresora
    """
    negocio = datos_venta.get('negocio', {
        'nombre': 'FRUTERIA',
        'direccion': '',
        'telefono': '',
        'rut': ''
    })

    fecha = datos_venta.get('fecha', datetime.now())
    items = datos_venta.get('items', [])
    total = datos_venta.get('total', 0)
    subtotal = datos_venta.get('subtotal', total / 1.19)
    iva = datos_venta.get('iva', total - subtotal)
    venta_id = datos_venta.get('id', 0)

    buffer = []

    # Inicializar impresora
    buffer.append(ESC + '@')

    # Encabezado centrado y en negrita
    buffer.append(ALIGN_CENTER)
    buffer.append(BOLD_ON)
    buffer.append(DOUBLE_WIDTH + DOUBLE_HEIGHT)
    buffer.append(negocio['nombre'])
    buffer.append(NORMAL_SIZE)
    buffer.append(BOLD_OFF)

    if negocio.get('direccion'):
        buffer.append(negocio['direccion'])
    if negocio.get('telefono'):
        buffer.append(f"TEL: {negocio['telefono']}")
    if negocio.get('rut'):
        buffer.append(f"RUT: {negocio['rut']}")

    buffer.append(LINE_FEED)
    buffer.append(ALIGN_LEFT)

    # Información de la venta
    buffer.append(f"BOLETA N°: {venta_id:06d}")
    buffer.append(LINE_FEED)
    if isinstance(fecha, datetime):
        buffer.append(f"FECHA: {fecha.strftime('%d/%m/%Y')}")
        buffer.append(LINE_FEED)
        buffer.append(f"HORA: {fecha.strftime('%H:%M:%S')}")
    else:
        buffer.append(f"FECHA: {fecha}")
    buffer.append(LINE_FEED)
    buffer.append('-' * 40)
    buffer.append(LINE_FEED)

    # Cabecera de productos
    buffer.append(f"{'PRODUCTO':<14} {'UND':>4} {'CANT':>5} {'PRECIO':>10}")
    buffer.append(LINE_FEED)
    buffer.append('-' * 40)
    buffer.append(LINE_FEED)

    # Productos
    for item in items:
        nombre = item['nombre'][:12]
        cantidad = item['cantidad']
        precio = item['precio']
        tipo_unidad = item.get('tipo_unidad', 'unidad')
        unidad_str = 'kg' if tipo_unidad == 'kg' else 'un'

        if cantidad == int(cantidad):
            cant_str = f"{int(cantidad)}"
        else:
            cant_str = f"{cantidad:.2f}"

        buffer.append(f"{nombre:<14} {unidad_str:>4} {cant_str:>5} ${precio:>8.0f}")
        buffer.append(LINE_FEED)

    buffer.append('-' * 40)
    buffer.append(LINE_FEED)

    # Totales
    buffer.append(ALIGN_RIGHT)
    buffer.append(f"Subtotal: ${subtotal:.0f}")
    buffer.append(LINE_FEED)
    buffer.append(f"IVA (19%): ${iva:.0f}")
    buffer.append(LINE_FEED)

    # Total final en grande y negrita
    buffer.append(ALIGN_CENTER)
    buffer.append(BOLD_ON)
    buffer.append(DOUBLE_WIDTH + DOUBLE_HEIGHT)
    buffer.append(f"TOTAL: ${total:.0f}")
    buffer.append(NORMAL_SIZE)
    buffer.append(BOLD_OFF)
    buffer.append(LINE_FEED)

    # Pie de boleta
    buffer.append(ALIGN_CENTER)
    buffer.append(LINE_FEED)
    buffer.append('GRACIAS POR SU COMPRA')
    buffer.append(LINE_FEED)
    buffer.append('VUELVA PRONTO')
    buffer.append(LINE_FEED)
    buffer.append(LINE_FEED)
    buffer.append(LINE_FEED)

    # Cortar papel
    buffer.append(CUT_PAPER)

    return ''.join(buffer).encode('latin-1', errors='replace')


def imprimir_boleta(datos_venta):
    """
    Intenta imprimir la boleta en la impresora térmica.

    Args:
        datos_venta: Diccionario con los datos de la venta

    Returns:
        dict: Resultado de la operación
    """
    # Verificar si la impresora está disponible
    if not detectar_impresora():
        vista_previa = formatear_boleta(datos_venta)
        return {
            'success': False,
            'message': 'No se detectó la impresora térmica en COM3.',
            'impresora_detectada': False,
            'vista_previa': vista_previa
        }

    try:
        # Abrir conexión serial
        with serial.Serial(PRINTER_PORT, PRINTER_BAUDRATE, timeout=PRINTER_TIMEOUT) as ser:
            # Preparar datos para impresión
            datos_impresion = formatear_boleta_escpos(datos_venta)

            # Enviar a la impresora
            ser.write(datos_impresion)
            ser.flush()

            return {
                'success': True,
                'message': 'Boleta impresa correctamente',
                'impresora_detectada': True
            }

    except serial.SerialException as e:
        vista_previa = formatear_boleta(datos_venta)
        return {
            'success': False,
            'message': f'Error al conectar con la impresora: {str(e)}',
            'impresora_detectada': False,
            'vista_previa': vista_previa
        }
    except Exception as e:
        vista_previa = formatear_boleta(datos_venta)
        return {
            'success': False,
            'message': f'Error al imprimir: {str(e)}',
            'impresora_detectada': False,
            'vista_previa': vista_previa
        }


def generar_vista_previa(datos_venta):
    """
    Genera una vista previa de la boleta en formato HTML.

    Args:
        datos_venta: Diccionario con los datos de la venta

    Returns:
        dict: Datos para renderizar la vista previa
    """
    negocio = datos_venta.get('negocio', {
        'nombre': 'FRUTERIA',
        'direccion': '',
        'telefono': '',
        'rut': ''
    })

    return {
        'negocio': negocio,
        'venta_id': datos_venta.get('id', 0),
        'fecha': datos_venta.get('fecha', datetime.now()),
        'items': datos_venta.get('items', []),
        'total': datos_venta.get('total', 0),
        'subtotal': datos_venta.get('subtotal', 0),
        'iva': datos_venta.get('iva', 0),
        'impresora_detectada': detectar_impresora()
    }