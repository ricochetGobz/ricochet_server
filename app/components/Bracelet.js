/**
 * app/components/Cube.js
 *
 * The cube with her stats
 *
 */

import five from 'johnny-five';
import Particle from 'particle-io';

const VEL = 0.2;
const TIMER = 5;
const NOTE_TIMING_MAX = 5;

const MAX_SENSOR = 255;
const MEDIUM_SENSOR = 170;
const MIN_SENSOR = 85;


export default class Bracelet {
  constructor(IPAddress, PORT) {
    this.IPAddress = IPAddress;
    this.PORT = PORT || 48879;

    this.board = new five.Board({
      io: new Particle({
        host: this.IPAddress,
        port: this.PORT,
      }),
    });

    this.leftMotor = {
      speed: 0,
      five: false,
      active: false,
      lastNotePlayed: new Date(),
    };
    this.rightMotor = {
      speed: 0,
      five: false,
      active: false,
      lastNotePlayed: new Date(),
    };

    this.board.on('ready', () => {
      this._initMotors();

      this.board.loop(50, this._update.bind(this));
    });
  }

  _initMotors() {
    this._initMotor(this.leftMotor, 'D2');
    this._initMotor(this.rightMotor, 'D3');
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

  _update() {
    // TODO faire une décramentation plus lente et proportinelle pour chaque note.
    if (this.leftMotor.active && ((new Date() - this.leftMotor.lastNotePlayed) / 100) > this.leftMotor.duration) {
      this.leftMotor.speed = 0;
      this.leftMotor.five.speed(this.leftMotor.speed);
      if (this.leftMotor.speed < 20) this.leftMotor.active = false;
    }

    if (this.rightMotor.active && ((new Date() - this.rightMotor.lastNotePlayed) / 100) > this.rightMotor.duration) {
      this.rightMotor.speed = 0;
      this.rightMotor.five.speed(this.rightMotor.speed);
      if (this.rightMotor.speed < 20) this.rightMotor.active = false;
    }
  }

  playNote(note) {
    switch (note) {
      case 1:
        this._setSpeed(this.leftMotor, 255, 3);
        break;
      case 2:
        this._setSpeed(this.leftMotor, 210, 4);
        break;
      case 3:
        this._setSpeed(this.leftMotor, 168, 5);
        break;
      case 4:
        this._setSpeed(this.rightMotor, 126, 9);
        break;
      case 5:
        this._setSpeed(this.rightMotor, 84, 12);
        break;
      case 6:
        this._setSpeed(this.rightMotor, 42, 15);
        break;
      default:
        console.log(`Note ${note} received not defined`);
        break;
    }
  }

  _setSpeed(motor, speed, duration) {
    motor.five.speed(speed);
    motor.duration = duration;
    motor.active = true;
    motor.lastNotePlayed = new Date();
  }
}
