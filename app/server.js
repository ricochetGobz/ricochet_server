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

const cubes = {};
const bracelets = {};
const _OFBridge = new OFBridge();
const _WSServer = new WSServer(() => {
  _OFBridge.sendServerStatus(true);
});

let OFConnected = false;
let webRenderConnected = false;
let kinectConnected = false;

/**
 * #########################
 * OPEN FRAMEWORK
 * #########################
 */

_OFBridge.onOFStatusChange((isConnected) => {
  if (isConnected) {
    OFConnected = true;
    _OFBridge.sendServerStatus(true);
    _OFBridge.sendWebRenderStatus(webRenderConnected);

    _WSServer.sendToWebRender(adrs.OPEN_FRAMEWORKS_STATUS_CHANGE, isConnected);
  } else {
    OFConnected = false;
  }
  _WSServer.sendToWebRender(adrs.OPEN_FRAMEWORKS_STATUS_CHANGE, isConnected);
  console.log(`OPEN FRAMEWORK : ${isConnected ? 'ON' : 'OFF'}`);
});

_OFBridge.onKinectStatusChange((isConnected) => {
  kinectConnected = isConnected;
  _WSServer.sendToWebRender(adrs.KINECT_STATUS_CHANGE, isConnected);
  console.log(`KINECT : ${isConnected ? 'ON' : 'OFF'}`);
});

_OFBridge.onPlayCube((d) => {
  _WSServer.sendToWebRender(adrs.CUBE_PLAYED, JSON.stringify(d));
});

/**
 * #########################
 * RENDER WEB EVENTS
 * #########################
 */

_WSServer.on(adrs.WEB_RENDER_STATUS_CHANGE, (isConnected) => {
  webRenderConnected = isConnected;
  console.log(`Web Render : ${isConnected ? 'ON' : 'OFF'}`);
  _OFBridge.sendWebRenderStatus(isConnected);
  if (isConnected) {
    _WSServer.sendToWebRender(adrs.KINECT_STATUS_CHANGE, kinectConnected);
    _WSServer.sendToWebRender(adrs.OPEN_FRAMEWORKS_STATUS_CHANGE, kinectConnected);


    // TODO check si le nombre de cube est > 0.
  }
});

/**
 * #########################
 * CUBE EVENTS
 * #########################
 */

_WSServer.on(adrs.CUBE_CONNECTED, (idCube, idSound) => {
  cubes[idCube] = new Cube(idCube, idSound);
  // TODO SEND TO OF
});

_WSServer.on(adrs.CUBE_DISCONNECTED, (idCube) => {
  // TODO delete of other the cube
  delete cubes[idCube];
  // TODO SEND TO OF
});

_WSServer.on(adrs.CUBE_TOUCHED, (idCube) => {
  // TODO send to OF the cube of check if a new cube is see into OF.
});

_WSServer.on(adrs.CUBE_DRAGGED, (idCube) => {
  // TODO send to OF the cube of check if a new cube is see into OF.
});

_WSServer.on(adrs.CUBE_DRAG_END, (idCube) => {
  // TODO send to OF the cube of check if a new cube is see into OF.
});


/**
* #########################
* BRACELETS EVENTS
* #########################
*/
_WSServer.on(adrs.BRACELET_CONNECTED, (idBracelet) => {
  bracelets[idBracelet] = new Bracelet(idBracelet);
  // TODO send to OF the bracelet.
});
_WSServer.on(adrs.BRACELET_DISCONNECTED, (idBracelet) => {
  // TODO send to OF the bracelet.
  delete bracelets[idBracelet];
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
