/**
 * app/components/WSServer.js
 * Module to manage the websocket server
 * for the cubes, the web render and the gallery
 *
 */

import { server as WebSocketServer } from 'websocket';
import bodyParser from 'body-parser';
import express from 'express';
import path from 'path';

import utils from './utils';
import adrs from './addresses';




const PORT = process.env.PORT || 8080;
const PATH = `${__dirname}/../../../ricochet_render/public`;

const URL_RENDER_WEB = `http://localhost:${PORT}`;
const URL_RENDER_WEB_DEBUG = 'http://localhost:9966'; // for live coding
const URL_GALLERY = 'http://localhost:3333';

export default class WSServer {
  constructor(callback) {
    this._listeners = {};
    this._webRenderConnections = false;
    this._galleryConnections = false;

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

    // WEB SOCKET FOR WEB RENDER & GALLERY
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
    // CHECK IF THE CONNECTEITEM IS AN CUBE, BRACELET OR WEBREDER
    switch (request.origin) {
      case URL_RENDER_WEB:
      case URL_RENDER_WEB_DEBUG:
        if (this._webRenderConnection) this._webRenderConnection.close();
        this._webRenderConnection = this._createConnection(adrs.WEB_RENDER_STATUS_CHANGE, request);
        this._callListener(adrs.WEB_RENDER_STATUS_CHANGE, true);
        break;
      case URL_GALLERY:
        if (this._galleryConnection) this._galleryConnection.close();
        this._galleryConnection = this._createConnection(adrs.GALLERY_STATUS_CHANGE, request);
        this._callListener(adrs.GALLERY_STATUS_CHANGE, true);
        break;
      default:
        // Make sure we only accept requests from an allowed origin
        request.reject();
        utils.logDate(`Connection from origin ${request.origin} rejected.`);
    }
  }

  _createConnection(statusChangeAdrs, request) {
    let c = request.accept('echo-protocol', request.origin);

    // ON RECEIVE MESSAGE
    this._on(c, (message) => {
      const content = JSON.parse(message.utf8Data);
      const address = content.address;
      const data = content.data;
      utils.logInfo(`${request.origin} send -> ${content}`);

      if (address && data) {
        this._callListener(address, data);
      } else {
        utils.logError('WSServer._on() : WS message have not the good structure');
      }
    }, () => {
      c = false;
      this._callListener(statusChangeAdrs, false);
    });

    return c;
  }

  _on(connection, callbackMessage, callbackClose) {
    connection.on('message', (message) => {
      callbackMessage(message);
    });
    connection.on('close', (reasonCode, description) => {
      // utils.logDate(`Peer ${connection.remoteAddress} disconnected.`);
      // utils.logDate(`ReasonCode : ${reasonCode}`);
      // utils.logDate(`Description : ${description}`);
      callbackClose(reasonCode);
    });
  }

  _post(connection, address, data) {
    if (!utils.addressExist(address)) {
      utils.logError(`WSServer._post() : ${address} doesn't exist.`);
      return;
    }
    if (connection) {
      connection.sendUTF(JSON.stringify({ address, data }));
    } else {
      utils.logError('You cannot send message, the destination is disconnected.');
    }
  }

  _callListener(address, data) {
    if (!utils.addressExist(address)) {
      utils.logError(`WSServer._callListener() : ${address} doesn't exist.`);
      return;
    }
    if (this._listeners[address]) {
      this._listeners[address](data);
      return;
    }
    utils.logError(`WSServer._callListener() : ${address} not listened`);
  }

  /**
   * #########################
   * LISTENERS
   * #########################
   */
  onReceiveToSocket(address, callback) {
    if (!utils.addressExist(address)) {
      utils.logError(`WSServer.onReceiveToSocket() : ${address} doesn't exist.`);
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
      utils.logError(`WSServer.post() : ${address} doesn't exist.`);
      return;
    }
    this._app.post(address, (req, res) => {
      callback(req, res);
    });
  }

  /**
   * #########################
   * POST
   * #########################
   */
  postToWebRender(address, data) {
    utils.logInfo(`Post to the WebRender -> ${address}`);
    this._post(this._webRenderConnection, address, data);
  }

  postToGallery(address, data) {
    utils.logInfo(`Post to the Gallery -> ${address}`);
    this._post(this._galleryConnection, address, data);
  }

  /**
   * #########################
   * STATUS
   * #########################
   */
  webRenderConnected() {
    return (this._webRenderConnection);
  }
  galleryConnected() {
    return (this._galleryConnection);
  }
}
