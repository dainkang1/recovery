import { app, protocol, session, ipcMain, BrowserWindow, Menu } from "electron";
import Store from "secure-electron-store";
import fs from "fs";
import path from "path";
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { createIPCHandler } from "./electron-trpc";
import { appRouter } from "./api/_app";
import { scheme, requestHandler } from "./protocol";
import { createContext, pythonServer } from "./api/context";
import { minWidth } from "@mui/system";

app.on("quit", pythonServer.kill);
process.on("exit", pythonServer.kill);
process.on("uncaughtException", pythonServer.kill);
process.on("unhandledRejection", pythonServer.kill);

const isDev = process.env.NODE_ENV === "development";
const port = 8888; // Hardcoded; needs to match webpack.development.js and package.json
const selfHost = `http://localhost:${port}`;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: BrowserWindow | null = null;

async function createWindow() {
  // If you'd like to set up auto-updating for your app,
  // I'd recommend looking at https://github.com/iffy/electron-updater-example
  // to use the method most suitable for you.
  // eg. autoUpdater.checkForUpdatesAndNotify();

  if (!isDev) {
    // Needs to happen before creating/loading the browser window;
    // protocol is only used in prod
    protocol.registerBufferProtocol(
      scheme,
      requestHandler
    ); /* eng-disable PROTOCOL_HANDLER_JS_CHECK */
  }

  const store = new Store({
    path: app.getPath("userData"),
  });

  void pythonServer.spawn();

  // Use saved config values for configuring your
  // BrowserWindow, for instance.
  // NOTE - this config is not passcode protected
  // and stores plaintext values
  //let savedConfig = store.mainInitialStore(fs);

  // TODO: Enable nodeIntegration with no contextIsolation in dev. Disable in prod.

  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 680,
    title: "Fireblocks Recovery Utility",
    webPreferences: {
      devTools: isDev,
      nodeIntegration: true,
      contextIsolation: false,
      // nodeIntegrationInWorker: false,
      // nodeIntegrationInSubFrames: false,
      additionalArguments: [
        `--storePath=${store.sanitizePath(app.getPath("userData"))}`,
      ],
      preload: path.join(__dirname, "preload.js"),
      /* eng-disable PRELOAD_JS_CHECK */
      disableBlinkFeatures: "Auxclick",
    },
  });

  // Sets up main.js bindings for our electron store;
  // callback is optional and allows you to use store in main process
  const callback = function (success: boolean, initialStore: any) {
    console.log(
      `${!success ? "Uns" : "S"}uccessfully retrieved store in main process.`
    );
    console.log(initialStore); // {"key1": "value1", ... }
  };

  store.mainBindings(ipcMain, win, fs, callback);

  // Load app
  if (isDev) {
    win.loadURL(selfHost);
  } else {
    win.loadURL(`${scheme}://rse/index.html`);
  }

  win.webContents.on("did-finish-load", () => {
    win?.setTitle("Fireblocks Recovery Utility");
  });

  // Only do these things when in development
  if (isDev) {
    // Errors are thrown if the dev tools are opened
    // before the DOM is ready
    win.webContents.once("dom-ready", async () => {
      await installExtension([REACT_DEVELOPER_TOOLS])
        .then((name) => console.info(`Added Extension: ${name}`))
        .catch((err) => console.error("An error occurred: ", err))
        .finally(() => {
          require("electron-debug")(); // https://github.com/sindresorhus/electron-debug
          win?.webContents.openDevTools();
        });
    });
  }

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  // https://electronjs.org/docs/tutorial/security#4-handle-session-permission-requests-from-remote-content
  const ses = session;
  const partition = "default";
  ses
    .fromPartition(
      partition
    ) /* eng-disable PERMISSION_REQUEST_HANDLER_JS_CHECK */
    .setPermissionRequestHandler((webContents, permission, permCallback) => {
      const allowedPermissions = []; // Full list here: https://developer.chrome.com/extensions/declare_permissions#manifest

      if (allowedPermissions.includes(permission)) {
        permCallback(true); // Approve permission request
      } else {
        console.error(
          `The application tried to request permission for '${permission}'. This permission was not whitelisted and has been blocked.`
        );

        permCallback(false); // Deny
      }
    });

  // https://electronjs.org/docs/tutorial/security#1-only-load-secure-content;
  // The below code can only run when a scheme and host are defined, I thought
  // we could use this over _all_ urls
  // ses.fromPartition(partition).webRequest.onBeforeRequest({urls:["http://localhost./*"]}, (listener) => {
  //   if (listener.url.indexOf("http://") >= 0) {
  //     listener.callback({
  //       cancel: true
  //     });
  //   }
  // });
}

// Needs to be called before app is ready;
// gives our scheme access to load relative files,
// as well as local storage, cookies, etc.
// https://electronjs.org/docs/api/protocol#protocolregisterschemesasprivilegedcustomschemes
protocol.registerSchemesAsPrivileged([
  {
    scheme,
    privileges: {
      standard: true,
      secure: true,
    },
  },
]);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createIPCHandler({ router: appRouter, createContext });

  void createWindow();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  app.quit();
});

// https://electronjs.org/docs/tutorial/security#12-disable-or-limit-navigation
app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (contentsEvent, navigationUrl) => {
    /* eng-disable LIMIT_NAVIGATION_JS_CHECK  */
    const parsedUrl = new URL(navigationUrl);
    const validOrigins = [selfHost];

    // Log and prevent the app from navigating to a new page if that page's origin is not whitelisted
    if (!validOrigins.includes(parsedUrl.origin)) {
      console.error(
        `The application tried to navigate to the following address: '${parsedUrl}'. This origin is not whitelisted and the attempt to navigate was blocked.`
      );

      contentsEvent.preventDefault();
    }
  });

  contents.on("will-redirect", (contentsEvent, navigationUrl) => {
    /* eng-disable LIMIT_NAVIGATION_JS_CHECK  */
    const parsedUrl = new URL(navigationUrl);
    const validOrigins = [selfHost];

    if (!validOrigins.includes(parsedUrl.origin)) {
      console.error(
        `The application tried to redirect to the following address: '${navigationUrl}'. This attempt was blocked.`
      );

      contentsEvent.preventDefault();
    }
  });

  // https://electronjs.org/docs/tutorial/security#11-verify-webview-options-before-creation
  contents.on(
    "will-attach-webview",
    (contentsEvent, webPreferences, params) => {
      // Strip away preload scripts if unused or verify their location is legitimate
      // delete webPreferences.preload;
      // delete webPreferences.preloadURL;
      // Disable Node.js integration
      // webPreferences.nodeIntegration = false;
    }
  );

  // https://electronjs.org/docs/tutorial/security#13-disable-or-limit-creation-of-new-windows
  // This code replaces the old "new-window" event handling;
  // https://github.com/electron/electron/pull/24517#issue-447670981
  contents.setWindowOpenHandler(({ url }) => {
    if (url.includes("/qr")) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          frame: true,
          fullscreenable: false,
          modal: true,
          height: 428,
          width: 300,
          minHeight: 428,
          minWidth: 300,
          webPreferences: {
            devTools: isDev,
            nodeIntegration: true,
            contextIsolation: false,
            disableBlinkFeatures: "Auxclick",
          },
        },
      };
    }

    console.error(
      `The application tried to open a new window at the following address: '${url}'. This attempt was blocked.`
    );

    return {
      action: "deny",
    };
  });
});
