/**
 * app/components/Cube.js
 *
 * The cube with her stats
 *
 */

export default class Bracelet {
  constructor(idBracelet) {
    this.id = idBracelet;
  }

  isConnected() {
    return (this.id !== -1);
  }
}
