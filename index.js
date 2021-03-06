var express=require('express');
var mysql=require('mysql');
var socket=require('socket.io');
var bodyParser = require('body-parser'); 

const delay = require('delay');
var google = require('google')
google.resultsPerPage = 25

var speak = require('speakeasy-nlp');

//App setup
var app=express();

//look for ui files in views
app.set('views',__dirname + '/');
app.use(express.static(__dirname + '/js'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded


//Static files
app.use(express.static('public'));

//connect to db
var conn = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'clubmate'
});
conn.connect();

app.get('/',function(req,res){
res.render('index.html');
});

//search for article
app.get('/search',function(req,res){
	conn.query('SELECT Title from metadata where Title like "%'+req.query.key+'%"',
	function(err, rows, fields) {
		if (err) throw err;
		var data=[];
		//prepare data according to query
		for(i=0;i<rows.length;i++)
		{
			data.push(rows[i].Title);
		}
		res.send(JSON.stringify(data));
	});
});

//get art item data
app.post('/description',function(req,res){
	conn.query("SELECT * FROM metadata WHERE Title='"+req.body.item+"'",
	function(err, rows, fields) {
		if (err) throw err;
		res.send(rows[0]);
	});
});

//send me art
app.post('/sendme',function(req,res){
	
conn.query("SELECT * FROM metadata WHERE Title LIKE '"+req.body.object+"%' OR Material LIKE '"+req.body.object+"%' OR Provenance LIKE '"+req.body.object+"%' OR Type LIKE '"+req.body.object+"%' OR Collection LIKE '"+req.body.object+"%' OR Religion LIKE '"+req.body.object+"%'",
	function(err, rows, fields) {
		if (err) throw err;
		if(rows[0])
		{
			console.log(rows[0]);
			res.send(rows[0]);
		}
		else
		{

			conn.query("SELECT Title, LongDescription, Filename FROM metadata WHERE MATCH(ShortDescription,LongDescription,Keywords) AGAINST ('"+req.body.object+"' IN NATURAL LANGUAGE MODE)",
				function(err, rows, fields) {
					if (err) throw err;
					console.log(rows[0]);
					res.send(rows[0]);
				});
		}
	});
});

//get keyword searches
app.post('/explore',function(req,res){
	var link;
	var result = [];
	//var nextCounter = 0
	google(req.body.item, function (err, res){
		if (err) console.error(err)
			console.log(res.links);
		
		for (var i = 0; i < res.links.length; ++i) {
			link = res.links[i];
			result.push(link);
			console.log(link.title + ' - ' + link.href)
			//console.log(link.description + "\n")
		}
		
		/*if (nextCounter < 4) {
			nextCounter += 1
			if (res.next) res.next()
		}*/
	
	})
	//wait till all links scraped
	delay(5000)
    .then(() => {
        res.send(result);
    });
	
});


/*
console.log(speak.classify("send me a painting").tokens[3]);
var subj = speak.classify("send me a painting").tokens[3];
*/
//search subject or last token in Title*, Material*, Provenance*, 
//ShortDescription, LongDescription, Type*, Collection*, Keywords, Religion*	//* means single word
/*str = ShortDescription
str.search(token) > 0 then found
return first result's image*/

var server=app.listen(4000,function(){
  console.log('Listening to  request on port 4000');
});

//Socket setup
var io=socket(server);

io.on('connection',function(socket){
  console.log('Made socket connection',socket.id);

  socket.on('chat',function(data){
    io.sockets.emit('chat',data);
  });

});
