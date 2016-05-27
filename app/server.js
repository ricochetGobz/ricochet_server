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

const _cubes = {};
const _bracelets = {};
const _OFBridge = new OFBridge();
const _WSServer = new WSServer(() => {
  _OFBridge.sendServerStatus(true);
});

let _openFrameworksConnected = false;
let _webRenderConnected = false;
let _kinectConnected = false;
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
  console.log(`KINECT : ${isConnected ? 'ON' : 'OFF'}`);

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
  console.log(`Web Render : ${isConnected ? 'ON' : 'OFF'}`);
  _OFBridge.sendWebRenderStatus(_webRenderConnected);
  if (_webRenderConnected) {
    _WSServer.postToWebRender(adrs.KINECT_STATUS_CHANGE, _kinectConnected);
    // console.log(_openFrameworksConnected);
    _WSServer.postToWebRender(adrs.OPEN_FRAMEWORKS_STATUS_CHANGE, _openFrameworksConnected);
    _WSServer.postToWebRender(adrs.NBR_CUBE_FOUND, _nbrOfCubeFound);
  }
});

/**
* CUBE HTTP
*/
_WSServer.onReceiveToHTTP(adrs.CUBE_CONNECTED, (req, res) => {
  console.log('cube connected');

  // TODO get idCube, idSound
  const idCube = -1;
  const idSound = -1;

  _cubes[idCube] = new Cube(idCube, idSound);


  // TODO res json
  res.json({
    success: true,
    message: '200',
  });

  _OFBridge.sendCubeEvent(adrs.CUBE_TOUCHED, { idCube, idSound });
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DISCONNECTED, (req, res) => {

  // TODO get idCube, idSound
  const idCube = -1;
  const idSound = -1;

  // TODO delete of other the cube
  delete _cubes[idCube];

  _OFBridge.sendCubeEvent(adrs.CUBE_DISCONNECTED, { idCube, idSound });
});

_WSServer.onReceiveToHTTP(adrs.CUBE_TOUCHED, (req, res) => {
  console.log('cube Touched');
  console.log(req.body);
  // TODO get idCube
  _OFBridge.sendCubeEvent(adrs.CUBE_TOUCHED, { idCube: -1 });
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DRAGGED, (req, res) => {
  console.log('cube Dragged');
  // TODO get idCube
  _OFBridge.sendCubeEvent(adrs.CUBE_DRAGGED, { idCube: -1 });
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DRAG_END, (req, res) => {
  console.log('cube Drag end');
  // TODO get idCube
  _OFBridge.sendCubeEvent(adrs.CUBE_DRAG_END, { idCube: -1 });
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
