declare module 'qrcode' {
  type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
  type DataUrlOptions = {
    type?: 'image/png';
    width?: number;
    margin?: number;
    errorCorrectionLevel?: ErrorCorrectionLevel;
  };

  const QRCode: {
    toDataURL(text: string, options?: DataUrlOptions): Promise<string>;
  };

  export default QRCode;
}
