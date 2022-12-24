require("dotenv").config();

const fetch = require("node-fetch");

const client = require(`catboys`);
const catboy = new client();

const sharp = require("sharp");
const smartcrop = require("smartcrop-sharp");

const { REST } = require("@discordjs/rest");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

const setAvatar = async () => {
  try {
    const src = (await catboy.image()).url;

    const res = await fetch(src);

    const type = res.headers["content-type"];

    const buff = await res.buffer();

    smartcrop
      .crop(buff, { width: 128, height: 128 })
      .then(async function (result) {
        const crop = result.topCrop;

        const outBuff = await sharp(buff)
          .extract({
            width: crop.width,
            height: crop.height,
            left: crop.x,
            top: crop.y,
          })
          .resize(128, 128)
          .toBuffer();

        await rest.patch("/users/@me", {
          body: {
            avatar: `data:${type};base64,${outBuff.toString("base64")}`,
          },
          authPrefix: "",
        });

        console.log(`Done! ${src}`);
      });
  } catch (e) {}
};

setAvatar();

setInterval(async () => {
  await setAvatar();
}, 10 * 60 * 1000 + 1);
