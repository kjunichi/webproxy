var spawn=require('child_process').spawn;
function shspawn(command) {
return spawn('sh',['-c',command]);
}

child=shspawn('ls -l|grep test|wc -c');

child.stdout.on('data',function(data) {
	console.log("data = " +data);
});

child.on('close',function(code) {
console.log("code = "+code);
});

