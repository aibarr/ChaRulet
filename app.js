var express = require('express'),					
	app		= express(), 							
	server	= require('http').createServer(app),	
	io		= require('socket.io').listen(server),
	opentok = require('opentok'),
	ot = new opentok.OpenTokSDK('45007202', '4d18fa6486b40c894e2a55a5e9defe89d8a1cdfa'),
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
	//Pongo la bandera que no tengo conversa ahora mismo
	var compadre = 0;

	//Cuando entro a mi sala de Chat
	socket.on('entrar', function(data, callback){
		//Si ya está mi nick registrado
		if (nicknames.indexOf(data) != -1){
			//me aviso que ya está mi nombre por ahi dando vueltas
			callback(false);
		}
		else{
			//Sino aviso que sí puedo entrar
			callback(true);
			//Guardo mi nick
			socket.nickname = data;
			console.log('El usuario '+socket.nickname+' se ha conectado');
			//Lo pongo en un arreglo, y me registro en la lista de gente sola
			nicknames.push(socket.nickname);
			listaSesiones.push(socket);
			sesionesSolos.push(socket.nickname);

			var datos;
			//Le creamos una sesión al usuario
			/*ot.createSession('localhost', {}, function(session){
				datos = {
				 	sessionId: session.sessionId,
					token: ot.generateToken({
						sessionId: session.sessionId,
						role: opentok.Roles.MODERATOR
					})
				};
			});*/
			//Enviamos las credenciales de sesión
			socket.emit('sesion', datos	);
		}
	});

	//Cuando busque compañero
	socket.on('siguiente', function(data, callback){
		//Si antes tenia un compañero
		if(data != null){
			//Le aviso que se busque a otro
			socket.companero.emit('desuscribir', {});
			sesionesSolos.push(data);			
		}
		sesionesSolos.push(socket.nickname);

		//Ahora a buscar un compañero
		for(var i = 0; i < sesionesSolos.length; i++){
			//Si en la lista de solos hay alguien mas aparte de mi
			if(sesionesSolos[i] != socket.nickname && sesionesSolos[i]!=data){				
				var tmpPartner = sesionesSolos[i];
				//Eliminar al compañero de la lista de solitarios
				sesionesSolos.splice(i, 1);
				//Ahora me tengo que eliminar a mi
				sesionesSolos.splice(sesionesSolos.indexOf(socket.nickname),1);
				socket.companero = listaSesiones[buscarSocket(listaSesiones,tmpPartner)];
				listaSesiones[buscarSocket(listaSesiones,tmpPartner)].companero = socket;				
			}
		};
		//Si encontré a alguien para hablar
		if(socket.companero && data != socket.companero.nickname){
			callback(true);
			compadre = 1;
			//Me envío el nombre de mi compañero
			socket.emit('suscribete', socket.companero.nickname);
			//Y le envío mi nombre a mi compañero
			socket.companero.emit('suscribete', socket.nickname);
		}else{
			//Sino, me aviso que tengo que esperar
			callback(false);
			compadre = 0;
		};
	});

	//Cuando envíe mensaje
	socket.on('mensaje', function(data){
		var datos = {
			nick: socket.nickname,
			mensaje: data.mensaje
		};
		//Le envío el mensaje a mi compañero
		socket.companero.emit('mensaje', datos);
	});

	//Cuando me desconecte
	socket.on('disconnect', function(){
		console.log('Un usuario se desconectó\n');
		//Si tenia un compañero
		if(compadre) {
			//Le digo a la consola que me fui
			console.log('Se desconectó el usuario '+socket.nickname);
			//Le aviso que me fui
			socket.companero.emit('desuscribir', {});
			//Y aviso que mi compañero está solo
			sesionesSolos.push(socket.companero.nickname);
		}
		nicknames.splice(nicknames.indexOf(socket.nickname),1);
		listaSesiones.splice(listaSesiones.indexOf(socket),1);
	})	
});

function buscarSocket(arregloSocket, usuario){
	for(var i = 0; i < arregloSocket.length; i++){
		if(arregloSocket[i].nickname==usuario) return i;
	}
	return -1;
};