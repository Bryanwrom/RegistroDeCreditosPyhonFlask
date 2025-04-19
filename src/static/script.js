// Obtener referencias a elementos del DOM
const tabla = document.getElementById('tabla');
const form = document.getElementById('formulario');
const grafica = document.getElementById('grafica').getContext('2d');
const modoVista = document.getElementById('modoVista');
const modalEliminarElement = document.getElementById('modalEliminar');
const confirmarEliminarBtn = document.getElementById('confirmarEliminar');
const eliminarIdInput = document.getElementById('eliminar-id');

let chart; // Objeto para la instancia del gráfico
let creditosGlobal = []; // Arreglo que almacena los créditos cargados
let idAEliminar; // Variable para almacenar el ID del crédito a eliminar

// Mostrar los contenedores de tabla y gráfica
tablaContainer.style.display = 'block';
graficaContainer.style.display = 'block';

// Ejecutar la función cargarCreditos cuando el DOM haya sido cargado
document.addEventListener('DOMContentLoaded', cargarCreditos);

// Manejador del evento submit del formulario
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitar el comportamiento por defecto del formulario

    // Crear un objeto FormData con los valores del formulario
    const formData = new FormData(form);

    // Obtener los campos individuales del formulario
    const nombre = formData.get('nombre') || '';
    const apellidoPaterno = formData.get('apellido_paterno') || '';
    const apellidoMaterno = formData.get('apellido_materno') || '';

    // Construir el nombre completo del cliente
    const cliente = `${nombre.trim()} ${apellidoPaterno.trim()} ${apellidoMaterno.trim()}`;

    // Construir el objeto de datos para enviar a la API
    const data = {
        cliente,
        monto: parseFloat(formData.get('monto')),
        tasa_interes: parseFloat(formData.get('tasa_interes')),
        plazo: parseInt(formData.get('plazo')),
        fecha_otorgamiento: new Date().toISOString().split('T')[0] // Obtener solo la fecha actual
    };

    // Validar que monto y tasa de interés sean mayores a 0
    if (data.monto <= 0 || data.tasa_interes <= 0) {
        alert('El monto y la tasa de interés deben ser mayores a 0.');
        return;
    }

    try {
        // Enviar solicitud POST a la API con los datos del crédito
        const res = await fetch('/api/creditos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        // Verificar si la respuesta fue exitosa
        if (!res.ok) {
            throw new Error('Error al guardar el crédito');
        }

        form.reset();           // Limpiar el formulario
        cargarCreditos();       // Recargar la lista de créditos
    } catch (error) {
        console.error(error);
        alert('Hubo un error al guardar el crédito');
    }
});

// Cambiar el tipo de vista de la gráfica cuando el usuario selecciona una opción
modoVista.addEventListener('change', () => {
    renderizarGrafica(creditosGlobal);
});

// Función para obtener y mostrar los créditos desde la API
async function cargarCreditos() {
    try {
        const res = await fetch('/api/creditos');
        if (!res.ok) throw new Error('Error al cargar los créditos');

        const creditos = await res.json();
        creditosGlobal = creditos; // Almacenar los créditos globalmente

        // Mostrar u ocultar tabla y gráfica según haya datos o no
        if (creditos.length > 0) {
            tablaContainer.classList.remove('hide');
            graficaContainer.classList.remove('hide');
            tablaContainer.classList.add('show');
            graficaContainer.classList.add('show');
        } else {
            tablaContainer.classList.remove('show');
            graficaContainer.classList.remove('show');
            tablaContainer.classList.add('hide');
            graficaContainer.classList.add('hide');
        }

        // Limpiar la tabla y agregar filas con los créditos obtenidos
        tabla.innerHTML = '';
        creditos.forEach(c => {
            tabla.innerHTML += `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.cliente}</td>
                    <td>$${c.monto.toLocaleString()}</td>
                    <td>${c.tasa_interes}%</td>
                    <td>${c.plazo}</td>
                    <td>${c.fecha_otorgamiento}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1"
                            onclick="editar(${c.id}, '${c.cliente}', ${c.monto}, ${c.tasa_interes}, ${c.plazo}, '${c.fecha_otorgamiento}')">
                            Editar
                        </button>
                        <button class="btn btn-sm btn-info" onclick="mostrarCalculos(${c.monto}, ${c.tasa_interes}, ${c.plazo}, '${c.cliente}')">Cálculos</button>
                        <button class="btn btn-sm btn-danger me-1" onclick="mostrarModalEliminar(${c.id})">Eliminar</button>
                    </td>
                </tr>`;
        });

        // Generar la gráfica con los datos cargados
        renderizarGrafica(creditos);
    } catch (error) {
        console.error(error);
        alert('Hubo un error al cargar los datos de los créditos');
    }
}

// Función que renderiza la gráfica según el modo seleccionado
function renderizarGrafica(creditos) {
    if (chart) chart.destroy(); // Destruir gráfico anterior si existe

    const modo = modoVista.value;

    if (modo === 'todos') {
        // Agrupar montos por mes y año
        const montosPorMes = {};
        creditos.forEach(c => {
            const fecha = new Date(c.fecha_otorgamiento);
            const mes = fecha.toLocaleString('default', { month: 'long' });
            const año = fecha.getFullYear();
            const etiqueta = `${mes} ${año}`;
            montosPorMes[etiqueta] = (montosPorMes[etiqueta] || 0) + c.monto;
        });

        // Ordenar etiquetas por fecha
        const datosOrdenados = Object.entries(montosPorMes).sort((a, b) => {
            const [mesA, añoA] = a[0].split(' ');
            const [mesB, añoB] = b[0].split(' ');

            const numeroMesA = new Date(Date.parse(mesA + " 1, 2000")).getMonth();
            const numeroMesB = new Date(Date.parse(mesB + " 1, 2000")).getMonth();

            if (añoA !== añoB) {
                return parseInt(añoA) - parseInt(añoB);
            }
            return numeroMesA - numeroMesB;
        });

        const etiquetasOrdenadas = datosOrdenados.map(item => item[0]);
        const montosOrdenados = datosOrdenados.map(item => item[1]);
        const colores = etiquetasOrdenadas.map(() => getRandomColor());

        // Crear gráfico tipo barra con los montos por mes
        chart = new Chart(grafica, {
            type: 'bar',
            data: {
                labels: etiquetasOrdenadas,
                datasets: [{
                    label: 'Monto Total por Mes',
                    data: montosOrdenados,
                    backgroundColor: colores
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `$${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

    } else if (modo === 'porCliente') {
        // Agrupar montos por cliente
        const montosPorCliente = {};
        creditos.forEach(c => {
            montosPorCliente[c.cliente] = (montosPorCliente[c.cliente] || 0) + c.monto;
        });

        // Crear gráfico tipo pastel
        setTimeout(() => {
            chart = new Chart(grafica, {
                type: 'pie',
                data: {
                    labels: Object.keys(montosPorCliente),
                    datasets: [{
                        label: 'Distribución por Cliente',
                        data: Object.values(montosPorCliente),
                        backgroundColor: Object.keys(montosPorCliente).map(() => getRandomColor())
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return `${context.label}: $${context.raw.toLocaleString()}`;
                                }
                            }
                        }
                    },
                    layout: {
                        padding: {
                            top: 10,
                            bottom: 100,
                            left: 10,
                            right: 10
                        }
                    }
                }
            });
        }, 300);

    } else if (modo === 'porRango') {
        // Clasificar créditos por rangos de monto
        const rangos = {
            '0 - 1000': 0,
            '1000 - 5000': 0,
            '5000 - 10000': 0,
            '10000+': 0
        };

        creditos.forEach(c => {
            if (c.monto < 1000) rangos['0 - 1000'] += 1;
            else if (c.monto < 5000) rangos['1000 - 5000'] += 1;
            else if (c.monto < 10000) rangos['5000 - 10000'] += 1;
            else rangos['10000+'] += 1;
        });

        // Crear gráfico tipo barra con los rangos
        chart = new Chart(grafica, {
            type: 'bar',
            data: {
                labels: Object.keys(rangos),
                datasets: [{
                    label: 'Cantidad de Créditos por Rango',
                    data: Object.values(rangos),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        });
    }
}

// Función para generar un color aleatorio en formato rgba
function getRandomColor() {
    const r = Math.floor(Math.random() * 156 + 100);
    const g = Math.floor(Math.random() * 156 + 100);
    const b = Math.floor(Math.random() * 156 + 100);
    return `rgba(${r}, ${g}, ${b}, 0.6)`;
}
function mostrarCalculos(monto, tasaInteres, plazo, cliente) {
    // Calcular la tasa mensual a partir de la tasa anual ingresada
    const tasaMensual = tasaInteres / 100 / 12;
    const n = plazo; // Número total de pagos (meses)

    // Fórmula para calcular el pago mensual de una anualidad ordinaria
    const pagoMensual = monto * (tasaMensual * Math.pow(1 + tasaMensual, n)) / (Math.pow(1 + tasaMensual, n) - 1);

    // Calcular el interés total y el costo total del crédito
    const interesTotal = (pagoMensual * n) - monto;
    const costoTotal = pagoMensual * n;

    // Mostrar los resultados en el modal correspondiente
    document.getElementById('nombreClienteCalculos').textContent = `Cliente: ${cliente}`;
    document.getElementById('pagoMensualCalculos').textContent = `$${pagoMensual.toFixed(2)}`;
    document.getElementById('interesTotalCalculos').textContent = `$${interesTotal.toFixed(2)}`;
    document.getElementById('costoTotalCalculos').textContent = `$${costoTotal.toFixed(2)}`;

    // Obtener el modal y mostrarlo
    const modalCalculosElement = document.getElementById('modalCalculos');
    const modal = new bootstrap.Modal(modalCalculosElement);
    modal.show();
}

function mostrarModalEliminar(id) {
    // Asigna el ID del crédito a eliminar a la variable global
    idAEliminar = id;

    // Mostrar el modal de confirmación para eliminar
    const modal = new bootstrap.Modal(modalEliminarElement);
    modal.show();
}

function editar(id, cliente, monto, tasa_interes, plazo, fecha_otorgamiento) {
    // Asigna los valores recibidos a los campos del formulario de edición
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-cliente').value = cliente;
    document.getElementById('edit-monto').value = monto;
    document.getElementById('edit-tasa').value = tasa_interes;
    document.getElementById('edit-plazo').value = plazo;
    document.getElementById('edit-fecha').value = fecha_otorgamiento;

    // Muestra el modal de edición utilizando Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
    modal.show();
}

// Escucha el evento de envío del formulario de edición
document.getElementById('formEditar').addEventListener('submit', async (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario

    // Obtiene el ID del crédito desde el campo oculto
    const id = document.getElementById('edit-id').value;

    // Crea un objeto con los datos actualizados del formulario
    const data = {
        cliente: document.getElementById('edit-cliente').value,
        monto: parseFloat(document.getElementById('edit-monto').value),
        tasa_interes: parseFloat(document.getElementById('edit-tasa').value),
        plazo: parseInt(document.getElementById('edit-plazo').value),
        fecha_otorgamiento: document.getElementById('edit-fecha').value
    };

    // Valida que el monto y la tasa de interés sean mayores a 0
    if (data.monto <= 0 || data.tasa_interes <= 0) {
        alert('El monto y la tasa de interés deben ser mayores a 0.');
        return;
    }

    try {
        // Envía los datos actualizados mediante una solicitud PUT a la API
        const response = await fetch(`/api/creditos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        // Verifica si la respuesta es exitosa
        if (!response.ok) {
            throw new Error('Error al editar el crédito');
        }

        // Vuelve a cargar la lista de créditos actualizada
        cargarCreditos();

        // Cierra el modal de edición
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditar'));
        modal.hide();
    } catch (error) {
        console.error(error);
        alert('Hubo un error al editar el crédito');
    }
});

// Asignar evento de clic al botón de confirmar eliminación
confirmarEliminarBtn.addEventListener('click', async () => {
    if (!idAEliminar) return;

    try {
        // Solicitud para eliminar el crédito por ID
        const res = await fetch(`/api/creditos/${idAEliminar}`, {
            method: 'DELETE'
        });

        // Verificar si la operación fue exitosa
        if (!res.ok) throw new Error('Error al eliminar el crédito');

        // Ocultar el modal tras la eliminación
        const modal = bootstrap.Modal.getInstance(modalEliminarElement);
        modal.hide();

        // Recargar la lista de créditos actualizada
        cargarCreditos();
    } catch (error) {
        console.error(error);
        alert('Hubo un error al eliminar el crédito');
    }
});