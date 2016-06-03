/**
 * app/components/Cube.js
 *
 * The cube with her stats
 *
 */

import five from 'johnny-five';
import Particle from 'particle-io';

const VEL = 2;
const TIMER = 5;

const MAX_SENSOR = 255;
const MEDIUM_SENSOR = 180;
const MIN_SENSOR = 100;


export default class Bracelet {
  constructor(IPAddress) {
    this.IPAddress = IPAddress;

    this.board = new five.Board({
      io: new Particle({
        host: this.IPAddress,
        port: 48879,
      }),
    });

    this.leftMotor = {
      speed: 0,
      five: false,
      active: false,
    };
    this.rightMotor = {
      speed: 0,
      five: false,
      active: false,
    };

    this.board.on('ready', this._initMotors.bind(this));
  }

  isConnected() {
    return (this.IPAddress !== -1);
  }

  playNote(note) {
    switch (note) {
      case 1:
        this._setSpeed(this.leftMotor, MAX_SENSOR);
        break;
      case 2:
        this._setSpeed(this.leftMotor, MEDIUM_SENSOR);
        break;
      case 3:
        this._setSpeed(this.leftMotor, MIN_SENSOR);
        break;
      case 4:
        this._setSpeed(this.rightMotor, MIN_SENSOR);
        break;
      case 5:
        this._setSpeed(this.rightMotor, MEDIUM_SENSOR);
        break;
      case 6:
        this._setSpeed(this.rightMotor, MAX_SENSOR);
        break;
      default:
        console.log(`Note ${note} received not defined`);
        break;
    }
  }

  _initMotors() {
    console.log('init motors');
    this._initMotor(this.leftMotor, 'D0');
    this._initMotor(this.rightMotor, 'D1');
  }

  _initMotor(motor, pin) {
    motor.five = new five.Motor({ pin });

    motor.five.on('start', () => {
      console.log('start', Date.now());
    });

    motor.five.on('stop', () => {
      console.log('stop', Date.now());
    });

    motor.five.start(0);
  }

  _setSpeed(motor, speed) {
    if (motor.speed < speed) {
      motor.speed = speed;

      if (!motor.active) {
        motor.active = true;
        this._decrementSpeed(motor);
      }
    }
  }

  _decrementSpeed(motor) {
    motor.speed -= VEL;

    motor.five.speed(motor.speed);

    this.board.wait(TIMER, () => {
      if (motor.speed > 0.5) {
        this._decrementSpeed(motor);
      } else {
        motor.active = false;
      }
    });
  }
}
