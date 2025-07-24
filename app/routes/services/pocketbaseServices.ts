import PocketBase from "pocketbase";

class PocketBaseService {
  private pb: PocketBase;

  constructor() {
    this.pb = new PocketBase("http://127.0.0.1:8090");
  }

  getFileUrl(record: any, filename: string): string {
    return this.pb.files.getURL(record, filename);
  }
}

export const pocketBaseService = new PocketBaseService();
