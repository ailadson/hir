"use strict";

const querystring = require('querystring');
const http = require('http');
const fs = require('fs');

let MAX_REQUEST_AT_A_TIME = 100;
let REQUEST_PER_SCRIPT = 1;

function executeScripts(cb){
  let outputs = [];
  let filesExecuted = 0;

  readDirectory("./scripts/", (scripts) => {
    console.time('execute-scripts');

    let promises = scripts.map(script => {
      return new Promise((resolve, reject) => {
        let data = querystring.stringify({ 'script' : script });

        kickOffRequest(data,(answers) => {
          resolve(answers);
        });
      })
    });
    console.log(promises);
    Promise.all(promises).then((values) => {
      cb(values)
    });
  });
}

function kickOffRequest(data, cb, reqs, executions){
  executions = executions || 0;
  reqs = reqs || [];

  let options = {
    hostname: 'localhost',
    port: 5000,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  if(MAX_REQUEST_AT_A_TIME && executions < REQUEST_PER_SCRIPT){
    MAX_REQUEST_AT_A_TIME -= 1;
    executions++;

    let req = http.request(options, (res) => {
      MAX_REQUEST_AT_A_TIME += 1;

      res.setEncoding('utf8');
      res.on('data', (answer) => {
        console.log(executions);
        if(executions === REQUEST_PER_SCRIPT){
          cb(answer);
        } else {
          req.end();
        }
      });
    });

    req.write(data);
    reqs.push(req);


    if (reqs.length === 1) {
      req.end();
    }
  } else {
    setTimeout(() => {
      kickOffRequest(data, cb, reqs, executions)
    }, 500);
  }
}

// function executeScript(script, nextScript){
//   let executions = 100;
//   let data = querystring.stringify({ 'script' : script });
//   let options = {
//     hostname: 'localhost',
//     port: 5000,
//     path: '/',
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/x-www-form-urlencoded',
//       'Content-Length': Buffer.byteLength(data)
//     }
//   };
//
//
//   for (let i = 0; i < executions; i++) {
//     var req = http.request(options, (res) => {
//       res.setEncoding('utf8');
//       res.on('data', function (answer) {
//         if (i  === executions - 1) {
//           outputs.push(answer);
//
//           if (outputs.length === scripts.length){
//             cb(outputs);
//           }
//         }
//       });
//     });
//
//     req.write(data);
//     req.end();
//   }
// }


function readDirectory(dir, cb){
  let scripts = [];
  let filesRead = 0;

  fs.readdir(dir, (err, files) => {
    files.forEach((file) => {
      readFile(dir+file, (content) => {
        scripts.push(content);

        if(++filesRead === files.length) {
          cb(scripts);
        }
      });
    });
  });
}

function readFile(path, cb){
  fs.readFile(path, 'utf8', (err, content) => {
    if (err) {
      console.error(err);
      return;
    }

    cb(content);
  });
}

executeScripts(output => {
  console.timeEnd('execute-scripts');
  console.log(output);
});
