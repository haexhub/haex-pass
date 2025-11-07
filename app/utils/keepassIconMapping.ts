/**
 * Mapping von KeePass Standard-Icons (Index 0-68) zu haex-pass Icons
 *
 * KeePass Standard-Icons:
 * https://keepass.info/help/base/icons.html
 */
export const KEEPASS_ICON_MAP: Record<number, string> = {
  // 0: Key
  0: 'mdi:key',

  // 1: World/Globe
  1: 'streamline:web',

  // 2: Warning
  2: 'mdi:alert-outline',

  // 3: Network Server
  3: 'mdi:server',

  // 4: Klipper (Clipboard)
  4: 'mdi:clipboard-outline',

  // 5: Text document
  5: 'mdi:file-document-outline',

  // 6: Folder (closed)
  6: 'mdi:folder',

  // 7: Folder (open)
  7: 'mdi:folder-outline',

  // 8: Note/Paper
  8: 'mdi:note-outline',

  // 9: PDA/Phone
  9: 'pepicons-pop:smartphone-home-button',

  // 10: E-Mail
  10: 'mdi:email-outline',

  // 11: Configuration
  11: 'mdi:cog-outline',

  // 12: Notepad
  12: 'mdi:notebook-outline',

  // 13: World Socket
  13: 'proicons:wi-fi',

  // 14: Certificate
  14: 'mdi:certificate-outline',

  // 15: Terminal
  15: 'mdi:console',

  // 16: Console
  16: 'mdi:console',

  // 17: Printer
  17: 'mdi:printer-outline',

  // 18: Icon/Picture
  18: 'mdi:image-outline',

  // 19: Tux (Linux penguin)
  19: 'mdi:penguin',

  // 20: Apple
  20: 'mdi:apple',

  // 21: Wikipedia
  21: 'mdi:wikipedia',

  // 22: Money/Currency
  22: 'mdi:currency-usd',

  // 23: Certificate
  23: 'mdi:certificate-outline',

  // 24: Mobile phone
  24: 'pepicons-pop:smartphone-home-button',

  // 25: Disk
  25: 'mdi:harddisk',

  // 26: Drive
  26: 'mdi:harddisk',

  // 27: Digicam
  27: 'mdi:camera-outline',

  // 28: IRKickFlash
  28: 'mdi:flash-outline',

  // 29: KMail
  29: 'fe:mail',

  // 30: Misc
  30: 'mdi:cog-outline',

  // 31: KOrganizer
  31: 'mdi:calendar-outline',

  // 32: ASCII
  32: 'mdi:code-tags',

  // 33: Icons
  33: 'meteor-icons:star',

  // 34: KWrite
  34: 'mdi:pencil-outline',

  // 35: Trash
  35: 'mdi:trash-can-outline',

  // 36: Note
  36: 'mdi:note-outline',

  // 37: KNotify
  37: 'mdi:bell-outline',

  // 38: Wastebin
  38: 'mdi:trash-can-outline',

  // 39: Folder (Blue)
  39: 'mdi:folder',

  // 40: Folder (Open)
  40: 'mdi:folder-outline',

  // 41: Folder
  41: 'mdi:folder',

  // 42: Folder Open
  42: 'mdi:folder-outline',

  // 43: Folder Tar
  43: 'mdi:folder-zip-outline',

  // 44: Decrypted
  44: 'mdi:lock-open-outline',

  // 45: Encrypted
  45: 'mdi:lock-outline',

  // 46: Apply
  46: 'mdi:check',

  // 47: Signature
  47: 'mdi:draw',

  // 48: Thumbnail
  48: 'mdi:image-multiple-outline',

  // 49: Address Book
  49: 'mdi:book-outline',

  // 50: Text Editor
  50: 'mdi:file-document-edit-outline',

  // 51: Package
  51: 'mdi:package-variant',

  // 52: Folder Home
  52: 'mdi:home-outline',

  // 53: Tux
  53: 'mdi:penguin',

  // 54: Feather
  54: 'mdi:feather',

  // 55: Apple
  55: 'mdi:apple',

  // 56: Wiki
  56: 'mdi:wikipedia',

  // 57: Money
  57: 'mdi:cash',

  // 58: Certificate
  58: 'mdi:certificate-outline',

  // 59: Smartphone
  59: 'pepicons-pop:smartphone-home-button',

  // 60: Run
  60: 'fe:rocket',

  // 61: Configure
  61: 'proicons:wrench',

  // 62: Web Browser
  62: 'streamline:web',

  // 63: Archive
  63: 'mdi:archive-outline',

  // 64: Percentage
  64: 'mdi:percent-outline',

  // 65: Samba Unmount
  65: 'mdi:server-off',

  // 66: History
  66: 'mdi:history',

  // 67: Mail Find
  67: 'mdi:email-search-outline',

  // 68: Vector
  68: 'mdi:vector-square',
};

/**
 * Get haex-pass icon name for a KeePass standard icon index
 */
export function getIconForKeePassIndex(iconIndex: number | null | undefined): string | null {
  if (iconIndex === null || iconIndex === undefined) return null;
  return KEEPASS_ICON_MAP[iconIndex] || null;
}
