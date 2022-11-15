interface TellerOptions {
  channel: string;
  allowedOrigins?: string | string[];
}

interface TellerMessageOptions<T> {
  message: T;
  targetWindow: Window | MessageEventSource;
  origin?: string;
  timeout?: number;
}

interface TellerMessage<T> {
  channel: string;
  message: T;
}
