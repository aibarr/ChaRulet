var express = require('express'),					
	app		= express(), 							
	server	= require('http').createServer(app),	
	io		= require('socket.io').listen(server),
	opentok = require('opentok'),
	ot = opentok.OpenTokSDK('45007202', '4d18fa6486b40c894e2a55a5e9defe89d8a1cdfa'),
	nicknames = [],
	listaSesiones = [];
	sesionesSolos = [];


//hacer que el servidor escuche las peticiones en el puerto 3000
server.listen(3000);

/*	Ruteo de nuestra aplicación
	- "/" indica que llamaremos a esta función cuando se ingrese al index de nuestra aplicación
	- Luego definimos una funcion para manejar los requests y las responses http a nuestro server
	- Lo unico que hara, será llamar a un archivo llamado index.html.
*/
app.get("/", function(req, res){
	res.sendFile(__dirname + '/index.html');
});
//Definimos es directorio "Static" para estilos y JS :D
app.use(express.static(__dirname + '/'));

//Cuando un cliente se conecte
io.sockets.on('connection',function(socket){
	console.log("Un cliente se ha conectado");	

	socket.on('entrar', function(data, callback){
		if (nicknames.indexOf(data) != -1){
			callback(false);
		}
		else{			
			callback(true);
			socket.nickname = data;
			console.log('El usuario '+socket.nickname+' se ha conectado');
			nicknames.push(socket.nickname);
			listaSesiones.push(socket);
			sesionesSolos.push(socket.nickname);
			//Le creamos una sesión al usuario
			socket.emit('sesion', function(data){
				ot.createSession('localhost', {}, function(session){
					data ={
						sessionID: session.sessionID,
						token: ot.generateToken({
							sessionID: session.sessionID,
							role: opentok.Roles.MODERATOR
						})
					};
				});
			});
		}
	});

	//Cuando busque compañero
	socket.on('siguiente', function(data, callback){
		//El que busca pareja
		/*var buscando ={
			IDSesion: data.sessionID,
			nCliente: socket.sessionID
		};*/

		//Si antes tenia un compañero
		if(data != null){
			socket.companero.emit('desuscribir', {});
			sesionesSolos.push(data);
			sesionesSolos.push(socket.nickname);
		}

		for(var i = 0; i < sesionesSolos.length; i++){
			//Si en la lista de solos hay alguien mas aparte de mi
			if(sesionesSolos[i] != socket.nickname && sesionesSolos[i]!=data){
				var tmpPartner = sesionesSolos[i];
				//Eliminar al compañero de la lista de solitarios
				sesionesSolos.splice(i, 1);
				//Ahora me tengo que eliminar a mi
				sesionesSolos.splice(sesionesSolos.indexOf(socket.nickname),1);
				socket.companero = listaSesiones[nicknames.indexOf(tmpPartner)];
				listaSesiones[nicknames.indexOf(tmpPartner)].companero = socket;				
			}
		};
		//Si encontré a alguien para hablar
		if(socket.companero && data != socket.companero.nickname){
			callback(true);
			//Me envío el nombre de mi compañero
			socket.emit('suscribete', socket.companero.nickname);
			//Y le envío mi nombre a mi compañero
			socket.companero.emit('suscribete', socket.nickname);
		}else{
			callback(false);
		};
	});

	//Cuando envíe mensaje
	socket.on('mensaje', function(data){
		var destino = data.destino;
		var envio = data.mensaje;

		//console.log('Enviando mensaje a ' + $destino + '\n Contenido: '+ $envio);
		var datos = {
			nick: socket.nickname,
			mensaje: envio
		};
		//Le envío el mensaje a mi compañero
		socket.companero.emit('mensaje', datos);
	});

	socket.on('disconnect', function(){
		console.log('El usuario '+socket.nickname+' se desconectó')
		nicknames.splice(nicknames.indexOf(socket.nickname),1);
		listaSesiones.splice(listaSesiones.indexOf(socket),1);
	})	
});