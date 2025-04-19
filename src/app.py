from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

# ----------- Inicializar Base de Datos --------------
def init_db():
    """
    Inicializa la base de datos SQLite 'creditos.db' y crea la tabla 'creditos' si no existe.
    La tabla contiene información sobre los créditos otorgados, como cliente, monto, tasa de interés,
    plazo y fecha de otorgamiento.

    La estructura de la tabla es la siguiente:
    - id: Clave primaria autoincremental
    - cliente: Nombre del cliente que recibe el crédito
    - monto: Monto otorgado en el crédito
    - tasa_interes: Tasa de interés aplicada al crédito
    - plazo: Plazo del crédito en meses
    - fecha_otorgamiento: Fecha en la que se otorgó el crédito
    """
    conn = sqlite3.connect('creditos.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS creditos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT NOT NULL,
            monto REAL NOT NULL,
            tasa_interes REAL NOT NULL,
            plazo INTEGER NOT NULL,
            fecha_otorgamiento TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# ----------- Rutas API --------------------

@app.route('/')
def index():
    """
    Ruta principal que renderiza la página 'index.html'.

    :return: La plantilla 'index.html' para mostrar en el navegador.
    """
    return render_template('index.html')

@app.route('/api/creditos', methods=['GET'])
def obtener_creditos():
    """
    Ruta para obtener todos los créditos registrados en la base de datos.

    Realiza una consulta SELECT para obtener todos los registros de la tabla 'creditos' y los devuelve
    como un arreglo JSON.

    :return: Una lista de créditos en formato JSON.
    """
    conn = sqlite3.connect('creditos.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM creditos')
    creditos = cursor.fetchall()
    conn.close()
    return jsonify([
        {
            'id': c[0],
            'cliente': c[1],
            'monto': c[2],
            'tasa_interes': c[3],
            'plazo': c[4],
            'fecha_otorgamiento': c[5]
        } for c in creditos
    ])

@app.route('/api/creditos', methods=['POST'])
def agregar_credito():
    """
    Ruta para agregar un nuevo crédito a la base de datos.

    Recibe un objeto JSON con los datos del crédito y los inserta en la tabla 'creditos'.
    
    :return: Un mensaje de confirmación en formato JSON indicando que el crédito fue agregado.
    """
    data = request.json
    conn = sqlite3.connect('creditos.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO creditos (cliente, monto, tasa_interes, plazo, fecha_otorgamiento)
        VALUES (?, ?, ?, ?, ?)
    ''', (data['cliente'], data['monto'], data['tasa_interes'], data['plazo'], data['fecha_otorgamiento']))
    conn.commit()
    conn.close()
    return jsonify({'mensaje': 'Crédito agregado'}), 201

@app.route('/api/creditos/<int:id>', methods=['PUT'])
def editar_credito(id):
    """
    Ruta para actualizar un crédito existente.

    Recibe un objeto JSON con los nuevos datos del crédito y los actualiza en la tabla 'creditos' 
    basándose en el ID proporcionado en la URL.

    :param id: ID del crédito a actualizar.
    :return: Un mensaje de confirmación en formato JSON indicando que el crédito fue actualizado.
    """
    data = request.json
    conn = sqlite3.connect('creditos.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE creditos
        SET cliente = ?, monto = ?, tasa_interes = ?, plazo = ?, fecha_otorgamiento = ?
        WHERE id = ?
    ''', (data['cliente'], data['monto'], data['tasa_interes'], data['plazo'], data['fecha_otorgamiento'], id))
    conn.commit()
    conn.close()
    return jsonify({'mensaje': 'Crédito actualizado'})

@app.route('/api/creditos/<int:id>', methods=['DELETE'])
def eliminar_credito(id):
    """
    Ruta para eliminar un crédito de la base de datos.

    Elimina el crédito cuyo ID se pasa en la URL de la solicitud.

    :param id: ID del crédito a eliminar.
    :return: Un mensaje de confirmación en formato JSON indicando que el crédito fue eliminado.
    """
    conn = sqlite3.connect('creditos.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM creditos WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'mensaje': 'Crédito eliminado'})

@app.route('/api/creditos/<int:id>', methods=['GET'])
def obtener_credito_por_id(id):
    """
    Ruta para obtener los detalles de un crédito específico por su ID.

    Realiza una consulta SELECT para obtener un crédito en particular de la base de datos 
    basándose en el ID proporcionado en la URL.

    :param id: ID del crédito a recuperar.
    :return: Los detalles del crédito en formato JSON si se encuentra, o un mensaje de error si no se encuentra.
    """
    conn = sqlite3.connect('creditos.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM creditos WHERE id = ?', (id,))
    c = cursor.fetchone()
    conn.close()
    if c:
        return jsonify({
            'id': c[0],
            'cliente': c[1],
            'monto': c[2],
            'tasa_interes': c[3],
            'plazo': c[4],
            'fecha_otorgamiento': c[5]
        })
    else:
        return jsonify({'error': 'Crédito no encontrado'}), 404

if __name__ == '__main__':
    """
    Inicializa la base de datos y ejecuta la aplicación Flask en modo de depuración.

    La función 'init_db()' se ejecuta para asegurarse de que la base de datos esté configurada antes
    de iniciar la aplicación Flask.
    """
    init_db()
    app.run(debug=True)
