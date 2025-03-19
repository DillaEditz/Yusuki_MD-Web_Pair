const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  let num = req.query.number;
  async function YasukiPair() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    try {
      let YasukiPairWeb = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!YasukiPairWeb.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await YasukiPairWeb.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      YasukiPairWeb.ev.on("creds.update", saveCreds);
      YasukiPairWeb.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === "open") {
          try {
            await delay(10000);
            const sessionYasuki = fs.readFileSync("./session/creds.json");

            const auth_path = "./session/";
            const user_jid = jidNormalizedUser(YasukiPairWeb.user.id);

            function randomMegaId(length = 6, numberLength = 4) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += characters.charAt(
                  Math.floor(Math.random() * characters.length)
                );
              }
              const number = Math.floor(
                Math.random() * Math.pow(10, numberLength)
              );
              return `${result}${number}`;
            }

            const mega_url = await upload(
              fs.createReadStream(auth_path + "creds.json"),
              `${randomMegaId()}.json`
            );

            const string_session = mega_url.replace(
              "https://mega.nz/file/",
              ""
            );

            const sid = `*꧁ ༒ ☬ _Yasuki  Md_ ☬ ༒ ꧂*\n*╭───────────────────────●●►*\n> ‎\n> *Owner* :- *_Mr Dilla_*\n> ‎\n> *Wa Channel* :- https://whatsapp.com/channel/0029Vb5ZBnkFHWq24cuKkf04\n> ‎\n>*Contact Me* :- https://wa.me/+94764570094\n> ‎\n> *Github* :- https://www.github.com/DillaEditz\n> ‎\n*╰───────────────────────●●►*\n\n👉 ${string_session} 👈\n\n*This is the your Session ID, copy this id and paste into config.js file*`;
            const mg = `🛑 *Do not share this code to anyone* 🛑`;
            const dt = await YasukiPairWeb.sendMessage(user_jid, {
              image: {
                url: "https://iili.io/3okmx3B.jpg",
              },
              caption: sid,
            });
            const msg = await YasukiPairWeb.sendMessage(user_jid, {
              text: string_session,
            });
            const msg1 = await YasukiPairWeb.sendMessage(user_jid, { text: mg });
          } catch (e) {
            exec("pm2 restart YasukiMD");
          }

          await delay(100);
          return await removeFile("./session");
          process.exit(0);
        } else if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode !== 401
        ) {
          await delay(10000);
          YasukiPair();
        }
      });
    } catch (err) {
      exec("pm2 restart YasukiMD");
      console.log("service restarted");
      YasukiPair();
      await removeFile("./session");
      if (!res.headersSent) {
        await res.send({ code: "Service Unavailable" });
      }
    }
  }
  return await YasukiPair();
});

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
  exec("pm2 restart YasukiMD");
});

module.exports = router;
