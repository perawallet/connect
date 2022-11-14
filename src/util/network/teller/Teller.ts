const TELLER_MESSAGE_TIMEOUT = 1000;

class Teller<Message> {
  private channel: string;
  private listener?: (event: MessageEvent<TellerMessage<Message>>) => void;

  /**
   * Cross-origin solution to communicate between tabs, windows, and iframes.
     Usage:
        - Create a new Teller instance.
          - If you want to use a custom message type, you can pass it to Teller<MyMessageType>.
          - const tellerManager = new Teller<MyMessageType>();
        - Call tellerManager.sendMessage({message, targetWindow, origin}) to send a message to the other tab/window/iframe.
        - Call tellerManager.setupListener({onReceiveMessage}) to listen for messages from the other tab/window/iframe.
        - Call tellerManager.close(); to close the active listener.

      Details on: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
  */
  constructor(options: TellerOptions) {
    this.listener = undefined;
    this.channel = options.channel;
  }

  public setupListener({
    onReceiveMessage
  }: {
    onReceiveMessage: (event: MessageEvent<TellerMessage<Message>>) => void;
  }) {
    // Close the existing listener if it exists
    this.close();

    this.listener = (event: MessageEvent<TellerMessage<Message>>) => {
      if (typeof event.data === "object") {
        try {
          if (event.data.channel === this.channel) {
            onReceiveMessage(event);
          }
        } catch (error) {
          console.error(error);
        }
      }
    };

    // Set the new listener
    window.addEventListener("message", this.listener);
  }

  public sendMessage({
    message,
    targetWindow,
    origin,
    timeout = TELLER_MESSAGE_TIMEOUT
  }: TellerMessageOptions<Message>) {
    setTimeout(() => {
      const tellerMessage = {
        channel: this.channel,
        message
      };

      targetWindow.postMessage(tellerMessage, {
        // if the origin is not specified, the message will not be origin specific
        targetOrigin: origin || "*"
      });
    }, timeout);
  }

  public close() {
    if (this.listener) {
      window.removeEventListener("message", this.listener);

      this.listener = undefined;
    }
  }
}

export default Teller;
