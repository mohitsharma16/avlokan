import PocketBase from "pocketbase";

class PocketBaseService {
  private pb: PocketBase;

  constructor() {
    this.pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
  }

  getFileUrl(record: any, filename: string): string {
    return this.pb.files.getURL(record, filename);
  }
}

export const pocketBaseService = new PocketBaseService();
