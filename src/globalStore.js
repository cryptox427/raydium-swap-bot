class GlobalStore {
  constructor() {
    this.state = {
        newTokenAvailable: true
    }
  }

  get(key) {
    return this.state[key]
  }

  set(key, value) {
    this.state[key] = value
  }
}

const globalStore = new GlobalStore();
module.exports = globalStore;
