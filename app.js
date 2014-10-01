var express = require('express'),					
	app		= express(), 							
	server	= require('http').createServer(app),	
	io		= require('socket.io').listen(server),
	opentok = require('opentok'),
	ot =opentok.OpenTokSDK('45007202', '4d18fa6486b40c894e2a55a5e9defe89d8a1cdfa'),
	nicknames = [];									

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



});