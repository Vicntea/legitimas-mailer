import QRCode from "qrcode";

/* Funcion para generar QR
* @param uuid: string - El UUID que se desea codificar en el QR
* @returns Promise<Buffer> - Un buffer que contiene la imagen del QR en formato PNG
*/

export async function generateQr(uuid: string): Promise<Buffer> {
  return QRCode.toBuffer(uuid, {
    type: "png",
    width: 300,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}