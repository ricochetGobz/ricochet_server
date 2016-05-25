/**
 * app/components/OFBridge.js
 *
 * Module to manage communication between
 * OpenFramework and Node.js
 *
 */

import osc from 'node-osc';
import utils from './utils';
import adrs from './addresses';

const SENDER_PORT = 5555;
const RECEIVER_PORT = 4444;

export default class OFBridge {
  constructor() {
    // vars
    this._OFAlreadyConnected = false;
    this._KinectAlreadyConnected = false;
    this._listeners = {};

    // SEND MESSAGE
    this._client = new osc.Client('127.0.0.1', SENDER_PORT);

    // RECEIVE MESSAGE
    this._oscServer = new osc.Server(RECEIVER_PORT, '0.0.0.0');

    // LISTEN WHEN MESSAGE COMES
    this._oscServer.on('message', (message, rinfo) => {
      let msg = message;

      // CHECK THE DATA STRUCTURE OF OSC MESSAGE
      // Open Framework don't send the same array
      if (msg[0] === '#bundle') {
        msg = msg[2];
      }
      this._onMessageReceived(msg, rinfo);
    });
  }

  _onMessageReceived(msg, rinfo) {
    const address = msg[0];
    const content = msg[1];

    console.log(`          Message receive to ${address}`);

    if (!this._callListener(address, content)) {
      console.warn(`${address} address not used`);
      console.warn(rinfo);
    }
  }

  _callListener(address, content) {
    if (typeof this._listeners[address] === 'function') {
      this._listeners[address](content);
    } else {
      return false;
    }
    return true;
  }

  _send(address, data) {
    if (!utils.addressExist(address)) {
      console.log(`OFBridge._send() : ${address} doesn't exist.`);
      return;
    }
    const d = data || '';
    this._client.send(address, d);
  }

  /**
   * #########################
   * GENERIC RECEIVERS
   */
  on(address, callback) {
    if (!utils.addressExist(address)) {
      console.log(`OFBridge.on() ERROR : ${address} doesn't exist.`);
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


  /**
   * #########################
   * SERVER EVENTS
   */
  // RECEIVERS
  // SENDERS
  sendServerStatus(isConnected) {
    if (isConnected) {
      this._send(adrs.SERVER_CONNECTED);
    } else {
      this._send(adrs.SERVER_DISCONNECTED);
    }
  }


  /**
   * #########################
   * OPEN FRAMEWORK EVENTS
   */
  // RECEIVERS
  onOFStatusChange(callback) {
    this._listeners[adrs.OPEN_FRAMEWORKS_CONNECTED] = () => {
      // called only if OP not already connected
      if (!this._OFAlreadyConnected) {
        this._OFAlreadyConnected = true;
        callback(true);
      }
    };
    this._listeners[adrs.OPEN_FRAMEWORKS_DISCONNECTED] = () => {
      if (this._OFAlreadyConnected) {
        this._OFAlreadyConnected = false;
        this._callListener(adrs.KINECT_DISCONNECTED);
        callback(false);
      }
    };
  }

  onKinectStatusChange(callback) {
    this._listeners[adrs.KINECT_CONNECTED] = () => {
      if (!this._KinectAlreadyConnected) {
        this._KinectAlreadyConnected = true;
        callback(true);
      }
    };

    this._listeners[adrs.KINECT_DISCONNECTED] = () => {
      if (this._KinectAlreadyConnected) {
        this._KinectAlreadyConnected = false;
        callback(false);
      }
    };
  }
  // SENDERS


  /**
   * #########################
   * WEB RENDER EVENTS
   */
  // RECEIVERS
  // SENDERS
  sendWebRenderStatus(isConnected) {
    if (isConnected) {
      this._send(adrs.WEB_RENDER_CONNECTED);
    } else {
      this._send(adrs.WEB_RENDER_DISCONNECTED);
    }
  }

  /**
   * #########################
   * CUBE EVENT
   */

  // SENDERS
  sendCubeEvent(address, id) {
    if (typeof id === 'undefined') {
      utils.logError('OFBridge.sendCubeEvent() -- No id into argument');
      return;
    }

    if (utils.addressExist(address)) {
      this._send(address, id);
    }
  }
}
