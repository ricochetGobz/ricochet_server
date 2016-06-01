/**
 * app/server.js
 *
 * Base on node.js server
 *
 */

import OFBridge from './core/OFBridge';
import WSServer from './core/WSServer';
import Cube from './components/Cube';
import Bracelet from './components/Bracelet';

import adrs from './core/addresses';

var fs = require('fs');

const _cubes = {};
const _bracelets = {};
const _OFBridge = new OFBridge();
const _WSServer = new WSServer(() => {
  _OFBridge.sendServerStatus(true);
});

let _openFrameworksConnected = false;
let _kinectConnected = false;
let _webRenderConnected = false;
let _galleryConnected = false;
let _nbrOfCubeFound = 0;

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
  console.log(`Web Render : ${_webRenderConnected ? 'ON' : 'OFF'}`);
  _OFBridge.sendWebRenderStatus(_webRenderConnected);
  if (_webRenderConnected) {
    _WSServer.postToWebRender(adrs.KINECT_STATUS_CHANGE, _kinectConnected);
    // console.log(_openFrameworksConnected);
    _WSServer.postToWebRender(adrs.OPEN_FRAMEWORKS_STATUS_CHANGE, _openFrameworksConnected);
    _WSServer.postToWebRender(adrs.NBR_CUBE_FOUND, _nbrOfCubeFound);
  }
});

_WSServer.onReceiveToSocket(adrs.GALLERY_NEW_COMPOSITION, (compo) => {
  console.log('New composition receive.');
  _WSServer.postToGallery(adrs.GALLERY_NEW_COMPOSITION, compo);
});

/**
* GALLERY
*/
_WSServer.onReceiveToSocket(adrs.GALLERY_STATUS_CHANGE, (isConnected) => {
  _galleryConnected = isConnected;
  console.log(`Gallery : ${_galleryConnected ? 'ON' : 'OFF'}`);

  if (_galleryConnected) {

    let compo = {
      id: '1',
      title: 'compo1',
      author: 'author',
      createdAt: new Date('2016-05-29 15:00:54'),
      timeline: [],
    };
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

    // TODO envoyer les enregistrements déjà fait.
    _WSServer.postToGallery(adrs.GALLERY_COMPOSITIONS, [{
      id: '1',
      title: 'compo1',
      author: 'author',
      createdAt: new Date('2016-05-29 15:00:54'),
      timeline: [],
    }, {
      id: '2',
      title: 'compo2',
      author: 'author',
      createdAt: new Date('2016-05-29 10:16:50'),
      timeline: [],
    }, {
      id: '3',
      title: 'very long composition name',
      author: 'authr de fifou salut plop',
      createdAt: new Date('2016-03-20 02:00:57'),
      timeline: [],
    }, {
      id: '4',
      title: 'trollllolollraomejkflejklsjkljlk',
      author: 'jkljlkjklsjxsccjk ',
      createdAt: new Date('2015-12-29 22:16:57'),
      timeline: [],
    }]);
  }
});

/**
* CUBE HTTP
*/
_WSServer.onReceiveToHTTP(adrs.CUBE_CONNECTED, (req, res) => {
  console.log('cube connected');

  const idCube = req.body.cubeId;
  const idSound = req.body.idSound;

  if (typeof idCube === undefined && idSound === undefined) {
    console.log('onReceiveToHTTP() ERROR : idCube or idSound undefined');
    return;
  }
  _cubes[idCube] = new Cube(idCube, idSound);
  _OFBridge.sendCubeEvent(adrs.CUBE_CONNECTED, { idCube, idSound });

  res.json({
    success: true,
    message: '200',
  });

  _OFBridge.sendCubeEvent(adrs.CUBE_CONNECTED, { idCube, idSound });
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DISCONNECTED, (req, res) => {
  const idCube = req.body.cubeId;

  _OFBridge.sendCubeEvent(adrs.CUBE_DISCONNECTED, { idCube });
  delete _cubes[idCube];
});

_WSServer.onReceiveToHTTP(adrs.CUBE_TOUCHED, (req, res) => {
  // _OFBridge.sendCubeEvent(adrs.CUBE_TOUCHED, { idCube: req.body.cubeId });

  // TEMPS
  _OFBridge.sendCubeEvent(adrs.CUBE_CONNECTED, { idCube: req.body.cubeId, idSound: -1 });
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DRAGGED, (req, res) => {
  console.log('cube Dragged');
  // TODO get idCube
  _OFBridge.sendCubeEvent(adrs.CUBE_DRAGGED, { idCube: req.body.cubeId });
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DRAG_END, (req, res) => {
  console.log('cube Drag end');
  // TODO get idCube
  _OFBridge.sendCubeEvent(adrs.CUBE_DRAG_END, { idCube: req.body.cubeId });
});

/**
* BRACELETS HTTP
*/
_WSServer.onReceiveToHTTP(adrs.BRACELET_CONNECTED, (req, res) => {
  // TODO get idbracelet
  _bracelets[idBracelet] = new Bracelet(idBracelet);
  // TODO send to OF the bracelet.
});
_WSServer.onReceiveToHTTP(adrs.BRACELET_DISCONNECTED, (req, res) => {
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
