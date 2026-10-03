export function connectionLabel(state?: string) {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'opening':
      return 'Opening WhatsApp';
    case 'waiting_for_qr':
      return 'Scan QR code to connect';
    case 'error':
      return 'Connection needs attention';
    case 'disconnected':
      return 'Not connected';
    default:
      return 'Checking connection';
  }
}
