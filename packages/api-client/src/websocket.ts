/* eslint-disable @typescript-eslint/no-explicit-any */

declare const WebSocket: any;
declare function setTimeout(handler: (...args: any[]) => any, timeout: number): any;

export type WSHandler = {
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onError?: (err: any) => void;
  onClose?: (ev?: any) => void;
};

export class ReconnectingWebSocketClient {
  private ws?: any;
  private retries = 0;
  private closedByUser = false;

  constructor(private url: string, private handler: WSHandler = {}) {}

  connect() {
    this.closedByUser = false;
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.retries = 0;
      this.handler.onOpen?.();
    };
    this.ws.onmessage = (evt: any) => {
      try {
        const parsed = JSON.parse(evt.data as any);
        this.handler.onMessage?.(parsed);
      } catch {
        this.handler.onMessage?.(evt.data);
      }
    };
    this.ws.onerror = (err: any) => this.handler.onError?.(err);
    this.ws.onclose = () => {
      this.handler.onClose?.();
      if (!this.closedByUser) this.scheduleReconnect();
    };
  }

  send(obj: any) {
    this.ws?.send(typeof obj === "string" ? obj : JSON.stringify(obj));
  }

  close() {
    this.closedByUser = true;
    this.ws?.close();
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.retries++), 15000);
    setTimeout(() => this.connect(), delay);
  }
}
