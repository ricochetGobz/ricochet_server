/**
 * app/server.js
 *
 * Base on node.js server
 *
 */

import fs from 'fs';

import OFBridge from './core/OFBridge';
import WSServer from './core/WSServer';
import CubeController from './core/CubeController';
import Bracelet from './components/Bracelet';

import adrs from './core/addresses';
import utils from './core/utils';
import compositionsData from './core/compositions';


const COMPOSITION_FILE = 'app/core/compositions.json';

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


function createCube(idCube, faceId, callback) {
  _cubeController.pushCube(idCube, faceId, () => {
    _OFBridge.sendCubeEvent(adrs.CUBE_CONNECTED, idCube, faceId);
    if (callback) callback();
  });
}

function saveCompositionData() {
  fs.exists(COMPOSITION_FILE, (exists) => {
    if (exists) {
      fs.writeFile(COMPOSITION_FILE, JSON.stringify(compositionsData), (err) => {
        if (err) throw err;
        utils.logInfo(`Composition saved.
          ${compositionsData.compositions.length} composition(s)`);
      });
    } else {
      utils.logError(`${COMPOSITION_FILE} not found.`);
    }
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

_OFBridge.on(adrs.OPEN_FRAMEWORKS_START_PLAYER, () => {
  utils.logEvent('start timer');
  _WSServer.postToWebRender(adrs.OPEN_FRAMEWORKS_START_PLAYER);
});

_OFBridge.on(adrs.CUBE_PLAYED, (d) => {
  _WSServer.postToWebRender(adrs.CUBE_PLAYED, JSON.stringify(d));

  const soundId = d.soundId;

  for (let i = 0; i < _bracelets.length; i++) {
    _bracelets[i].playNote(parseInt(soundId, 10));
  }
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

  // SAVE COMPOSITION INTO FILE
  compo.id = compositionsData.compositions.length;
  compositionsData.compositions.unshift(compo);
  saveCompositionData();

  // Send new composition into server
  _WSServer.postToGallery(adrs.GALLERY_NEW_COMPOSITION, compo);
});

/**
* GALLERY
*/
_WSServer.onReceiveToSocket(adrs.GALLERY_UPDATE_COMPOSITION, (composition) => {
  utils.logEvent(`Update composition ${composition.id}...`);

  for (let i = 0; i < compositionsData.compositions.length; i++) {
    if (compositionsData.compositions[i].id === composition.id) {
      compositionsData.compositions[i] = composition;
      saveCompositionData();
      return;
    }
  }

  utils.logError('The composition updated doesn\'t exist');
});

_WSServer.onReceiveToSocket(adrs.GALLERY_STATUS_CHANGE, (isConnected) => {
  _galleryConnected = isConnected;
  console.log(`GALLERY : ${_galleryConnected ? 'ON' : 'OFF'}`);

  if (_galleryConnected) {
    _WSServer.postToGallery(adrs.GALLERY_COMPOSITIONS, compositionsData.compositions);
  }
});


/**
* CUBE HTTP
*/
_WSServer.onReceiveToHTTP(adrs.CUBE_CONNECTED, (req, res) => {
  const idCube = parseInt(req.body.cubeId, 10) || -1;
  const faceId = parseInt(req.body.faceId, 10) || -1;

  utils.logEvent(`Cube ${idCube} connected`);

  createCube(idCube, faceId, () => {
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
  console.log(req.body);
  const idCube = parseInt(req.body.cubeId, 10) || -1;
  let faceId = parseInt(req.body.faceId, 10) || -1;

  // TEMPS disalow wainting for good accelerometer value
  faceId = -1;

  utils.logEvent(`Cube ${idCube} touched`);

  if (!_cubeController.cubeSaved(idCube)) {
    console.warn(`The cube ${idCube} is touched but not saved.`);
    createCube(idCube, faceId);
  }

  _OFBridge.sendCubeEvent(adrs.CUBE_TOUCHED, idCube, faceId);
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DRAGGED, (req, res) => {
  res.json({ success: true, message: '200' });
  const idCube = parseInt(req.body.cubeId, 10) || -1;
  const faceId = parseInt(req.body.faceId, 10) || -1;

  utils.logEvent(`Cube ${idCube} dragged on face ${faceId}`);

  if (!_cubeController.cubeSaved(idCube)) {
    console.warn(`The cube ${idCube} is touched but not saved.`);
    createCube(idCube, faceId);
  }

  _OFBridge.sendCubeEvent(adrs.CUBE_DRAGGED, idCube, faceId);
});

_WSServer.onReceiveToHTTP(adrs.CUBE_DRAG_END, (req, res) => {
  res.json({ success: true, message: '200' });
  const idCube = parseInt(req.body.cubeId, 10) || -1;
  const faceId = parseInt(req.body.faceId, 10) || -1;

  utils.logEvent(`cube ${idCube} drag end`);

  if (!_cubeController.cubeSaved(idCube)) {
    console.warn(`The cube ${idCube} is touched but not saved.`);
    createCube(idCube, faceId);
  }

  _OFBridge.sendCubeEvent(adrs.CUBE_DRAG_END, idCube, faceId);
});

_WSServer.onReceiveToHTTP(adrs.CUBE_FACE_CHANGED, (req, res) => {
  res.json({ success: true, message: '200' });
  const idCube = parseInt(req.body.cubeId, 10) || -1;
  const faceId = parseInt(req.body.faceId, 10) || -1;

  utils.logEvent(`cube ${idCube} face changed ${faceId}`);

  if (!_cubeController.cubeSaved(idCube)) {
    console.warn(`The cube ${idCube} is touched but not saved.`);
    createCube(idCube, faceId);
  }

  _OFBridge.sendCubeEvent(adrs.CUBE_FACE_CHANGED, idCube, faceId);
});

/**
* BRACELETS HTTP
*/
_WSServer.onReceiveToHTTP(adrs.BRACELET_CONNECTED, (req, res) => {
  res.json({ success: true, message: '200' });
  const IPAddress = req.body.braceletIp;
  const PORT = req.body.braceletPort;

  utils.logEvent(`bracelet connected at ${IPAddress}`);

  // WARN multiple connection not implemented by johnny-five.
  // for (let i = 0; i < _bracelets.length; i++) {
  //   if (_bracelets[i].IPAddress === IPAddress) {
  //     _bracelets.splice(i, 1);
  //     return;
  //   }
  // }

  _bracelets.push(new Bracelet(IPAddress, PORT));
});

// TODO detect disconnection
// _WSServer.onReceiveToHTTP(adrs.BRACELET_DISCONNECTED, (req, res) => {
//   res.json({ success: true, message: '200' });
//   const IPAddress = req.body.braceletIp;
//   for (let i = 0; i < _bracelets.length; i++) {
//     if (_bracelets[i].IPAddress === IPAddress) {
//     _bracelets.splice(i, 1);
//     return;
//     }
//   }
// });

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
