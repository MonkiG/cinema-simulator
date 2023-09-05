import getRandomInt from '../helpers/getRandomInt'
import Client from './Client'

export default class CinemaController {
  time
  isClosed = true // Variable bandera para saber si el cine esta cerrado
  firstRecursive = true // variable bandera para saver si es la primera recursion del handleClients

  /* Colas del cine */
  timeoutQueue = [] // Esta cola se usara para limpiar todos los timeouts cuando cierre el cine
  clientQueue = []
  clientExpress = []
  clients = []

  // Estadisticas de las cajas
  cajaEstadistica = new Array(5).fill(0).map((_, index) => (
    {
      caja: index + 1,
      clients: 0,
      tickets: 0,
      time: 0
    }
  )) // Se crea un array de 5 elementos en el cual se le asignan objetos con su respectivo indice

  /* Estos atributos son los que manejaran la interfaz de usuario */
  expressCajaDom // Variable que almacena el elemento de la caja express
  cajasDom // Variable que almacena el elemento de las cajas que no son express (ARRAY)
  clientListDom // Variable que almacena el elemento de la cola de clientes

  constructor (time = 3, expressCajaDom, cajasDom, clientListDom) {
    this.time = time * 60 * 1000 // Atributo que define el tiempo que estara abierto el cine
    this.expressCajaDom = expressCajaDom
    this.cajasDom = cajasDom
    this.clientListDom = clientListDom

    const cajaExpress = Number(this.expressCajaDom.getAttribute('number')) - 1
    this.cajaEstadistica[cajaExpress].isExpress = true
  }

  // Metodo que inicializara la logica del cine
  open (timerDom) {
    this.isClosed = false
    this.#timer(timerDom)

    if (this.isClosed === false) {
      // primer  intervalo
      const initialInterval = getRandomInt(1, 5) * 1000
      const firstTimeout = setTimeout(() => this.#clientInterval(), initialInterval)
      this.timeoutQueue.push(firstTimeout)
      this.#handleExpressClients()
      setTimeout(() => {
        this.close()
      }, this.time)
      this.#handleClients()
    }
  }

  // Metodo para manejar el timer del cine (PRIVADO)
  #timer (timerDom) {
    // Se crea un intervalo que se ejecutara cada segundo (1000 milisegundos)
    const timerInterval = setInterval(() => {
      const time = this.#formatTime() // Formateara el tiempo que estara abierto el cine
      timerDom.setAttribute('timer', time) // Establece el elemento html que manejara el timer
      if (time === '0:00') {
        clearInterval(timerInterval) // Cuando el timer sea 0 se limpiara el intervalo
      }
    }, 1000)
  }

  // Metodo para iniciar la generacion de clientes aleatorios (PRIVADO)
  #clientInterval () {
    // Si el cine esta cerrado se cierra la recursividad
    if (this.isClosed === true) {
      return
    }

    const userCount = getRandomInt(1, 20)

    // Genera de 1 a 20 clientes dependiendo el contador
    for (let i = 1; i <= userCount; i++) {
      const newClient = new Client()
      this.clients.push(newClient)
      if (newClient.tickets === 1) {
        this.clientExpressCounter++
        this.clientExpress.push(newClient)
        this.clientListDom.setAttribute('new-client-express', newClient.id) // Manda el cliente al elemento html para mostrarlo en la UI
      } else {
        this.clientCounter++
        this.clientQueue.push(newClient)
        this.clientListDom.setAttribute('new-client', newClient.id) // Manda el cliente al elemento html para mostrarlo en la UI
      }
    }

    // Genera la siguiente recursividad
    const nextInterval = getRandomInt(1, 5) * 1000 // genera un numero del 1000 al 5000 (MILISEGUNDOS)
    const recursiveTimeout = setTimeout(() => this.#clientInterval(), nextInterval)

    this.timeoutQueue.push(recursiveTimeout)
  }

  // Metodo para formatear el tiempo (PRIVADO)
  #formatTime () {
    this.time = this.time - 1000
    const minutes = Math.floor(this.time / 60000)
    const seconds = ((this.time % 60000) / 1000).toFixed(0)
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`
  }

  // Metodo para manejar la logica de asignacion a caja de los clientes express (PRIVADO)
  #handleExpressClients () {
    // Como los clientes express solo tienen un ticket se genera un intervalo de cada 3 segundos
    const expressClientsInterval = setInterval(() => {
      const firstExpressQueueUser = this.clientExpress.shift() // Obtiene el primer cliente de la cola
      const clientAttributeValue = firstExpressQueueUser?.id ?? '' // obtiene el id del cliente, si no lo encuentra asigna un string vacio
      // Manda a el cliente a la interfaz de usuario
      this.expressCajaDom.setAttribute('client', `${JSON.stringify(firstExpressQueueUser)}`)
      this.clientListDom.setAttribute('delete-client-express', clientAttributeValue)
      if (firstExpressQueueUser) {
        const cajaExpressData = this.cajaEstadistica.find(caja => caja.isExpress)
        cajaExpressData.clients += 1
        cajaExpressData.tickets += 1
        cajaExpressData.time += firstExpressQueueUser.tickets * 3000
      }
      // Si no hay clientes y esta cerrado el cine limpia el intervalo y muestra "sin clientes"
      if (this.clientExpress.length === 0 && this.isClosed === true) {
        clearInterval(expressClientsInterval)
        this.expressCajaDom.shadowRoot.querySelector('h3').innerHTML = 'Sin clientes'
      }
    }, 3000)
  }

  // Metodo para manejar la logica de asignacion a caja de los clientes no express (PRIVADO)
  #handleClients () {
    const recursiveInterval = (caja, client) => {
      if (!client && this.isClosed === true) {
        caja.shadowRoot.querySelector('h3').innerHTML = 'Sin clientes'
      }
      const cajaNumber = Number(caja.getAttribute('number'))
      // Si no ha cliente se detiene la recursividad
      caja.setAttribute('client', JSON.stringify(client)) // Asigna el cliente a la caja

      this.clientListDom.setAttribute('delete-client', client?.id ?? '') // Elimina al cliente de la cola (Interfaz de usuario)
      const tiempoDeEspera = client.tickets * 3000 // Genera el tiempo de espera para asignar un nuevo cliente
      // Busca la caja correspondiente
      const cajaEstadistica = this.cajaEstadistica.find(cajaEstadistica => cajaEstadistica.caja === cajaNumber && !caja.isExpress)
      // Asigna valores a las estadisticas
      cajaEstadistica.clients += 1
      cajaEstadistica.tickets += client.tickets
      cajaEstadistica.time += client.tickets * 3000
      // Asigna un nuevo cliente a la caja despues de pasar el tiempo de espera
      setTimeout(() => {
        recursiveInterval(caja, this.clientQueue.shift())
      }, tiempoDeEspera)
    }

    if (this.firstRecursive) {
      // Si es la primera ejecución y no hay clientes, espera cada segundo hasta que lleguen clientes
      if (this.clientQueue.length === 0) {
        const interval = setInterval(() => {
          if (this.clientQueue.length > 0) {
            // Cuando lleguen clientes, marca la primera ejecución como completada y detén el intervalo
            this.firstRecursive = false
            clearInterval(interval)
            // Llama a #handleClients nuevamente para comenzar el proceso normalmente
            this.#handleClients()
          }
        }, 1000)
      } else {
        // Si es la primera ejecución y ya hay clientes, marca la primera ejecución como completada
        this.firstRecursive = false
      }
    }

    // Genera la recursividad de acuerdo a las cajas no express
    let i = 0
    while (i < this.cajasDom.length) {
      const firstQueueUser = this.clientQueue.shift()
      const caja = this.cajasDom[i]

      if (firstQueueUser) {
        recursiveInterval(caja, firstQueueUser)
        i++
      } else {
        const alternativeFirstQueueUSer = this.clientQueue.shift()

        // cajaEstadistica.clients += 1
        // cajaEstadistica.tickets += alternativeFirstQueueUSer.tickets
        // cajaEstadistica.time += alternativeFirstQueueUSer.tickets * 3000

        recursiveInterval(caja, alternativeFirstQueueUSer)
        // Si no hay más usuarios en la cola, sal del bucle
      }
    }
  }

  // Metodo para cerrar el cine y limpiar los timeouts
  close () {
    this.isClosed = true
    // Limpia todos los timeouts que se abrieron al generar los clientes
    this.timeoutQueue.forEach(timeout => clearTimeout(timeout))
    // alert('Cine closed')
    const endInterval = setInterval(() => {
      const sinClientes = []
      this.cajasDom.forEach((caja) => {
        sinClientes.push(caja.shadowRoot.querySelector('h3').innerHTML)
      })
      const sinClientesExpress = this.expressCajaDom.shadowRoot.querySelector('h3').innerHTML

      const flag = sinClientes.find(data => data !== 'Sin clientes')

      if (!flag && sinClientesExpress === 'Sin clientes') {
        clearInterval(endInterval)
        const data = this.cajaEstadistica
          .map(caja => {
            const tiempoEnMilisegundos = caja.time
            const minutos = Math.floor(tiempoEnMilisegundos / 60000)
            const segundos = ((tiempoEnMilisegundos % 60000) / 1000).toFixed(0)
            const tiempoLegible = `${minutos}:${segundos < 10 ? `0${segundos}` : segundos}`
            let cajaInfo = `* Caja ${caja.caja}:`

            if (caja.isExpress) {
              cajaInfo += ' (Caja Express)'
            }

            cajaInfo += `
            clientes: ${caja.clients}
            tickets: ${caja.tickets}
            time: ${tiempoLegible}
          `

            return cajaInfo
          })
          .join('\n\n').trim()
        alert(data)
      }
    }, 1000)
  }
}
