/**
 * app/components/WSServer.js
 * Module to manage the websocket server
 * for the cubes, the web render and the gallery
 *
 */

import { server as WebSocketServer } from 'websocket';
import bodyParser from 'body-parser';
import express from 'express';
import fs from 'fs';
import path from 'path';

import utils from './utils';
import adrs from './addresses';



const PORT = process.env.PORT || 8080;
const PATH = `${__dirname}/../../../ricochet_render/public`;

const URL_RENDER_WEB = `http://localhost:${PORT}`;
const URL_RENDER_WEB_DEBUG = 'http://localhost:9966'; // for live coding
// const URL_CUBE = 'TODO';
// const URL_BRACELET = 'TODO';

export default class WSServer {
  constructor(callback) {
    this._listeners = {};
    this._webRenderConnection = false;

    // HTTP PART
    this._app = express();
    this._app.use(express.static(path.resolve(PATH)));
    this._app.use(bodyParser.json());
    this._app.use(bodyParser.urlencoded({
      extended: true,
    }));

    this._app.get('/', (req, res) => {
      utils.logDate(`Received request for  ${req.url}`);
      res.sendFile('index.html');
    });

    this._server = this._app.listen(PORT, () => {
      utils.logDate(`Server is listening on port ${PORT}`);
      callback();
    });

    // WEB SOCKET FOR WEB RENDER
    this.wsServer = new WebSocketServer({
      httpServer: this._server,
      autoAcceptConnections: false,
    });
    this.wsServer.on('request', (request) => {
      this._checkOrigin(request);
    });
  }

  /**
   * #########################
   * CONNECTION MANAGER
   * #########################
   */
  _checkOrigin(request) {
    // CHECK IF THE CONNECTED ITEM IS AN CUBE, BRACELET OR WEBREDER
    switch (request.origin) {
      case URL_RENDER_WEB:
      case URL_RENDER_WEB_DEBUG:
        this._createWebRenderConnection(request);
        break;
      // case URL_CUBE:
      //   this._createCubeConnection(request);
      //   break;
      // case URL_BRACELET:
      //   this._createBraceletConnection(request);
      //   break;
      default:
        // Make sure we only accept requests from an allowed origin
        request.reject();
        utils.logDate(`Connection from origin ${request.origin} rejected.`);
    }
  }

  _createWebRenderConnection(request) {
    if (this._webRenderConnection) {
      utils.logError('web render connection already exist');
      return;
    }

    this._webRenderConnection = request.accept('echo-protocol', request.origin);

    // CONNECTED
    this._callListener(adrs.WEB_RENDER_STATUS_CHANGE, true);

    // ON WEB RENDER RECEIVE MESSAGE
    this._on(this._webRenderConnection, (message) => {
      const content = message.utf8Data;
      console.log(`Web Render send : ${content}`);
    }, () => {
      this._webRenderConnection = false;
      this._callListener(adrs.WEB_RENDER_STATUS_CHANGE, false);
    });
  }

  // _createCubeConnection(request) {
  //   // const connection = request.accept('arduino', request.origin);
  //   // CONNECTED
  //
  //   // TODO GetCubeId && CubeIdSound
  //   this._callListener(adrs.CUBE_CONNECTED, -1, -1);
  // }
  // _createBraceletConnection(request) {
  //   // const connection = request.accept('arduino', request.origin);
  //   // CONNECTED
  //
  //   // TODO GetBraceletId
  //   this._callListener(adrs.BRACELET_CONNECTED, -1);
  // }

  _on(connection, callbackMessage, callbackClose) {
    connection.on('message', (message) => {
      callbackMessage(message);
    });
    connection.on('close', (reasonCode, description) => {
      utils.logDate(`Peer ${connection.remoteAddress} disconnected.`);
      utils.logDate(`ReasonCode : ${reasonCode}`);
      utils.logDate(`Description : ${description}`);
      callbackClose(reasonCode);
    });
  }

  /**
   * #########################
   * LISTENERS
   * #########################
   */
  _callListener(address, data) {
    if (!utils.addressExist(address)) {
      console.log(`_callListener ERROR : ${address} doesn't exist.`);
      return;
    }
    if (this._listeners[address]) {
      this._listeners[address](data);
      return;
    }
    console.log(`_callListener ERROR : ${address} not listened`);
  }

  onReceiveToSocket(address, callback) {
    if (!utils.addressExist(address)) {
      console.log(`WSServer.on() ERROR : ${address} doesn't exist.`);
      return;
    }

    this._listeners[address] = (data) => {
      if (utils.isJSON(data)) {
        callback(JSON.parse(data));
      } else {
        callback(data);
      }
    };
  }

  onReceiveToHTTP(address, callback) {
    if (!utils.addressExist(address)) {
      console.log(`WSServer.post() ERROR : ${address} doesn't exist.`);
      return;
    }
    this._app.post(address, (req, res) => {
      callback(req, res);
    });
  }

  postToWebRender(address, data) {
    if (!utils.addressExist(address)) {
      console.log(`WSServer.postToWebRender() ERROR : ${address} doesn't exist.`);
      return;
    }
    if (this._webRenderConnection) {
      this._webRenderConnection.sendUTF(JSON.stringify({ address, data }));
    } else {
      utils.logError('You cannot send message, web render is disconnected');
    }
  }

  // STATUS
  webRenderConnected() {
    return (this._webRenderConnection);
  }
}
