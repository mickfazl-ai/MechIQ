const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'MechIQ',
    show: false,
    backgroundColor: '#E9F1FA',
  });

  // Load from built files
  win.loadFile(path.join(__dirname, 'build', 'index.html'));

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

const menu = Menu.buildFromTemplate([
  { label: 'View', submenu: [
    { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
    { label: 'Full Screen', role: 'togglefullscreen' },
    { type: 'separator' },
    { label: 'Zoom In', role: 'zoomIn' },
    { label: 'Zoom Out', role: 'zoomOut' },
    { label: 'Reset Zoom', role: 'resetZoom' },
  ]},
  { label: 'Window', submenu: [
    { label: 'Minimise', role: 'minimize' },
    { label: 'Maximise', role: 'maximize' },
    { type: 'separator' },
    { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
  ]}
]);

app.whenReady().then(() => {
  Menu.setApplicationMenu(menu);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
