/**
 * app/server.js
 *
 * Base on node.js server
 *
 */

import OFBridge from './core/OFBridge';
import WSServer from './core/WSServer';
import CubeController from './core/CubeController';
import Bracelet from './components/Bracelet';

import adrs from './core/addresses';
import utils from './core/utils';

import DataCompo from './core/compositions';

var fs = require('fs');

const _bracelets = [];
const _cubeController = new CubeController();

const _OFBridge = new OFBridge();
const _WSServer = new WSServer(() => {
  _OFBridge.sendServerStatus(true);
});

let _openFrameworksConnected = false;
let _kinectConnected = false;
let _webRenderConnected = false;
let _galleryConnected = false;
let _nbrOfCubeFound = 0;


function createCube(idCube, idSound, callback) {
  _cubeController.pushCube(idCube, idSound, () => {
    _OFBridge.sendCubeEvent(adrs.CUBE_CONNECTED, idCube, idSound);
    if (callback) callback();
  });
}

/**
 * #########################
 * OPEN FRAMEWORK
 * #########################
 */
_OFBridge.onOFStatusChange((isConnected) => {
  _openFrameworksConnected = isConnected;
  console.log(`OPEN FRAMEWORK : ${_openFrameworksConnected ? 'ON' : 'OFF'}`);

  if (_openFrameworksConnected) {
    _OFBridge.sendServerStatus(_openFrameworksConnected);
    _OFBridge.sendWebRenderStatus(_webRenderConnected);

    _cubeController.applyToCubes((cube) => {
      _OFBridge.sendCubeEvent(adrs.CUBE_CONNECTED, cube.id, cube.sound);
    });
  }

  _WSServer.postToWebRender(adrs.OPEN_FRAMEWORKS_STATUS_CHANGE, _openFrameworksConnected);
});

_OFBridge.onKinectStatusChange((isConnected) => {
  _kinectConnected = isConnected;
  console.log(`KINECT : ${_kinectConnected ? 'ON' : 'OFF'}`);

  _WSServer.postToWebRender(adrs.KINECT_STATUS_CHANGE, _kinectConnected);
});

_OFBridge.on(adrs.CUBE_PLAYED, (d) => {
  _WSServer.postToWebRender(adrs.CUBE_PLAYED, JSON.stringify(d));
});

_OFBridge.on(adrs.NBR_CUBE_FOUND, (nbrCubeFound) => {
  _nbrOfCubeFound = nbrCubeFound;
  _WSServer.postToWebRender(adrs.NBR_CUBE_FOUND, _nbrOfCubeFound);
});

/**
 * #########################
 * WEB SERVER
 * #########################
 */

 /**
 * WEB RENDER SOCKET
 */
_WSServer.onReceiveToSocket(adrs.WEB_RENDER_STATUS_CHANGE, (isConnected) => {
  _webRenderConnected = isConnected;
  console.log(`WEB RENDER : ${_webRenderConnected ? 'ON' : 'OFF'}`);
  _OFBridge.sendWebRenderStatus(_webRenderConnected);
  if (_webRenderConnected) {
    _WSServer.postToWebRender(adrs.KINECT_STATUS_CHANGE, _kinectConnected);
    // console.log(_openFrameworksConnected);
    _WSServer.postToWebRender(adrs.OPEN_FRAMEWORKS_STATUS_CHANGE, _openFrameworksConnected);
    _WSServer.postToWebRender(adrs.NBR_CUBE_FOUND, _nbrOfCubeFound);
  }
});

_WSServer.onReceiveToSocket(adrs.GALLERY_NEW_COMPOSITION, (compo) => {
  utils.logEvent('New composition receive : ');

  if (typeof compo !== 'object') {
    utils.logError(`The composition received is not an object : ${compo}`);
    return;
  }

  var fileName = 'app/core/compositions.json';
  fs.exists(fileName, function(exists) {
  if (exists) {
    fs.stat(fileName, function(error, stats) {
      fs.open(fileName, "r", function(error, fd) {
        var buffer = new Buffer("stats.size");

        fs.writeFile(fileName, JSON.stringify(compo), 0, "utf8", function(error, bytesRead, buffer) {
          fs.read(fd, buffer, 0, buffer.length, null, function(error, bytesRead, buffer) {
            var data = buffer.toString("utf8", 0, buffer.length);

            console.log(data);
            fs.close(fd);
          });
        });
      });
    });
    // var buffer = new Buffer(JSON.stringify(compo));


  } else console.log("NIQUE TOI")
  });

  _WSServer.postToGallery(adrs.GALLERY_NEW_COMPOSITION, compo);
});

/**
* GALLERY
*/
_WSServer.onReceiveToSocket(adrs.GALLERY_STATUS_CHANGE, (isConnected) => {
  _galleryConnected = isConnected;
  console.log(`GALLERY : ${_galleryConnected ? 'ON' : 'OFF'}`);

  if (_galleryConnected) {

    // TODO envoyer les enregistrements déjà fait.
    _WSServer.postToGallery(adrs.GALLERY_COMPOSITIONS, [DataCompo]);
  }
});

/**
* CUBE HTTP
*/
_WSServer.onReceiveToHTTP(adrs.CUBE_CONNECTED, (req, res) => {
  const idCube = parseInt(req.body.cubeId, 10);
  const idSound = parseInt(req.body.idSound, 10);

  utils.logEvent(`Cube ${idCube} connected`);

  createCube(idCube, idSound, () => {
    res.json({ success: true, message: '200' });
  });
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DISCONNECTED, (req, res) => {
  res.json({ success: true, message: '200' });
  const idCube = parseInt(req.body.cubeId, 10);

  _OFBridge.sendCubeEvent(adrs.CUBE_DISCONNECTED, idCube);
  _cubeController.removeCube(idCube);
});

_WSServer.onReceiveToHTTP(adrs.CUBE_TOUCHED, (req, res) => {
  res.json({ success: true, message: '200' });
  const idCube = parseInt(req.body.cubeId, 10);
  const idSound = parseInt(req.body.idSound, 10);

  utils.logEvent(`Cube ${idCube} touched`);

  if (!_cubeController.cubeSaved(idCube)) {
    console.warn(`The cube ${idCube} is touched but not saved.`);
    createCube(idCube, idSound);
  }

  _OFBridge.sendCubeEvent(adrs.CUBE_TOUCHED, idCube, idSound);
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DRAGGED, (req, res) => {
  res.json({ success: true, message: '200' });
  const idCube = parseInt(req.body.cubeId, 10);
  const idSound = parseInt(req.body.idSound, 10);

  console.log(req.body);

  utils.logEvent(`Cube ${idCube} dragged`);

  if (!_cubeController.cubeSaved(idCube)) {
    console.warn(`The cube ${idCube} is touched but not saved.`);
    createCube(idCube, idSound);
  }

  _OFBridge.sendCubeEvent(adrs.CUBE_DRAGGED, idCube);
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DRAG_END, (req, res) => {
  res.json({ success: true, message: '200' });
  const idCube = parseInt(req.body.cubeId, 10);
  const idSound = parseInt(req.body.idSound, 10);

  utils.logEvent(`cube ${idCube} drag end`);

  if (!_cubeController.cubeSaved(idCube)) {
    console.warn(`The cube ${idCube} is touched but not saved.`);
    createCube(idCube, idSound);
  }

  _OFBridge.sendCubeEvent(adrs.CUBE_DRAG_END, idCube);
});

_WSServer.onReceiveToHTTP(adrs.CUBE_FACE_CHANGED, (req, res) => {
  res.json({ success: true, message: '200' });
  const idCube = parseInt(req.body.cubeId, 10);
  const idSound = parseInt(req.body.idSound, 10);

  utils.logEvent(`cube ${idCube} face changed ${idSound}`);

  if (!_cubeController.cubeSaved(idCube)) {
    console.warn(`The cube ${idCube} is touched but not saved.`);
    createCube(idCube, idSound);
  }

  _OFBridge.sendCubeEvent(adrs.CUBE_FACE_CHANGED, idCube, idSound);
});

/**
* BRACELETS HTTP
*/
_WSServer.onReceiveToHTTP(adrs.BRACELET_CONNECTED, (req, res) => {
  res.json({ success: true, message: '200' });
  const IPAddress = req.body.braceletIp;

  console.log(req.body);

  utils.logEvent(`bracelet connected at ${IPAddress}`);

  _bracelets.push(new Bracelet(IPAddress));
});

_WSServer.onReceiveToHTTP(adrs.BRACELET_DISCONNECTED, (req, res) => {
  res.json({ success: true, message: '200' });
  // TODO get idbracelet
  // TODO send to OF the bracelet.
  delete _bracelets[idBracelet];
});

/**
 * #########################
 * ON EXIT
 * #########################
 * http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
 * http://stackoverflow.com/questions/21271227/can-node-js-detect-when-it-is-closed
 */
function exit(err) {
  _OFBridge.sendServerStatus(false);
  // WARN : SetTimeout for waiting the sender.
  setTimeout(() => {
    if (err) console.log(err.stack);
    process.exit();
  }, 200);
}
// so the program will not close instantly
process.stdin.resume();
// do something when app is closing
// process.on('exit', exit);
// catches ctrl+c event
process.on('SIGINT', exit);
// catches closed windows
process.on('SIGHUP', exit);
// catches uncaught exceptions
process.on('uncaughtException', exit);
