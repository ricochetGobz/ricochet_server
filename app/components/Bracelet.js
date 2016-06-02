/**
 * app/components/Cube.js
 *
 * The cube with her stats
 *
 */

export default class Bracelet {
  constructor(IPAddress) {
    this.IPAddress = IPAddress;

    // TODO create firmata
  }

  isConnected() {
    return (this.IPAddress !== -1);
  }
}
