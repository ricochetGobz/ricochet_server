/**
 * app/components/CubeController.js
 *
 * Manage cubes connected or not
 *
 */

import utils from './utils';

import Cube from '../components/Cube';


export default class CubeController {
  constructor() {
    this._cubes = [];
  }

  pushCube(idCube, idSound, callback) {
    if (typeof idCube === undefined && idSound === undefined) {
      utils.logError('CubeController.pushCube(): idCube or idSound undefined');
      return;
    }

    if (this.cubeSaved(idCube)) {
      utils.logError('CubeController.pushCube(): cube already saved.');
    } else {
      this._cubes.push(new Cube(idCube, idSound));
      utils.logInfo('new cube saved');
    }

    utils.logInfo(this._cubes);
    if (callback) callback();
  }

  removeCube(idCube) {
    let i;
    for (i = 0; i < this._cubes.length; i++) {
      if (this._cubes[i].id === idCube) {
        delete this._cubes[i];
        return;
      }
    }
    utils.logError(`The cube ${idCube} cannot be removed.
      He was been never saved.`
    );
  }

  applyToCubes(callback) {
    utils.logInfo(`${this._cubes.length} cubes connected`);
    for (const cube of this._cubes) {
      callback(cube);
    }
  }

  cubeSaved(idCube) {
    if (idCube === 'undefined') {
      utils.logError('CubeController.cubeSaved(): idCube undefined');
    }
    for (const cube of this._cubes) {
      if (cube.id === idCube) return true;
    }
    return false;
  }

  getCube(idCube) {
    for (const cube of this._cubes) {
      return cube;
    }
    utils.logError(`No cubes connected with ${idCube} id.`);
    return false;
  }
}
