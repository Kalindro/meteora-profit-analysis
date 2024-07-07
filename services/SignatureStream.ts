import { Transform } from "stream";
import {
  type ConfirmedSignatureInfo,
  Connection,
  PublicKey,
} from "@solana/web3.js";

interface SignatureStreamEvents {
  data: (data: ConfirmedSignatureInfo[]) => void;
  error: (error: Error) => void;
  end: () => void;
}

export class SignatureStream extends Transform {
  private _connection: Connection;
  private _walletAddress: PublicKey;
  private _before?: string;
  private _until?: string;

  constructor(
    connection: Connection,
    walletAddress: string,
    before?: string,
    until?: string,
  ) {
    super({ objectMode: true });
    this._connection = connection;
    this._walletAddress = new PublicKey(walletAddress);
    this._before = before;
    this._until = until;
    this._streamSignatures().catch((error) => this.emit("error", error));
  }

  private async _streamSignatures() {
    let newSignatures: ConfirmedSignatureInfo[] = [];
    do {
      newSignatures = await this._connection.getConfirmedSignaturesForAddress2(
        this._walletAddress,
        {
          before: this._before,
          until: this._until,
        },
        "confirmed",
      );
      if (newSignatures.length > 0) {
        const validSignatures = newSignatures.filter(
          (signature) => !signature.err,
        );
        if (validSignatures.length > 0) {
          this.push(validSignatures);
        }
        this._before = newSignatures[newSignatures.length - 1].signature;
      }
    } while (newSignatures.length > 0);
    this.push(null);
  }

  on<Event extends keyof SignatureStreamEvents>(
    event: Event,
    listener: SignatureStreamEvents[Event],
  ): this {
    return super.on(event, listener);
  }

  emit<Event extends keyof SignatureStreamEvents>(
    event: Event,
    ...args: Parameters<SignatureStreamEvents[Event]>
  ): boolean {
    return super.emit(event, ...args);
  }

  push(
    chunk: ConfirmedSignatureInfo[] | null,
    encoding?: BufferEncoding,
  ): boolean {
    return super.push(chunk, encoding);
  }
}