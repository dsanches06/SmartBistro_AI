export class Order {
  constructor(data = {}) {
    Object.assign(this, data);
  }
  static fromObject(obj) {
    if (!obj || typeof obj !== "object") return null;
    return new Order(obj);
  }
  toPayload() {
    return { ...this };
  }
}
