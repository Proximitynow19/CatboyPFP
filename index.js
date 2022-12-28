require("dotenv").config();

const fetch = require("node-fetch");

const client = require(`catboys`);
const catboy = new client();

const sharp = require("sharp");
const smartcrop = require("smartcrop-sharp");

const { REST } = require("@discordjs/rest");

const { exec } = require("child_process");

const { mkdirSync, rmdirSync, readFileSync } = require("fs");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

const library_count = 338;
const use = 120;

const images = getRandomElements([...Array(library_count).keys()], use);

const setAvatar = async () => {
  try {
    const src = (await catboy.image()).url;

    const res = await fetch(src);

    const type = res.headers["content-type"];

    const buff = await res.buffer();

    await smartcrop
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

        rmdirSync("cats", { recursive: true, force: true });

        mkdirSync("cats");

        let i = 0;
        for (let _ = 0; _ < images.length; _++) {
          const src = `https://cdn.catboys.com/images/image_${
            images[_] + 1
          }.jpg`;
          fetch(src).then((res) => {
            res.buffer().then((buff) => {
              smartcrop
                .crop(buff, { width: 680, height: 240 })
                .then(function (result) {
                  const crop = result.topCrop;

                  sharp(buff)
                    .extract({
                      width: crop.width,
                      height: crop.height,
                      left: crop.x,
                      top: crop.y,
                    })
                    .resize(680, 240)
                    .toFile(`cats/${_ + 1}.jpg`)
                    .then(() => {
                      i++;
                      console.log(`${i}/${use}`);
                      if (i == use) {
                        console.log("Encoding...");

                        exec(
                          `ffmpeg -y -framerate 15 -i cats/%d.jpg -filter_complex "[0:v] setpts=1/(15*5), palettegen [p]; [0:v] [p] paletteuse" -loop 0 out.gif`,
                          async (e, stde, stdo) => {
                            console.log(e);
                            console.log("Finished rendering.");

                            const banner = readFileSync("out.gif", "base64");

                            await rest.patch("/users/@me", {
                              body: {
                                avatar: `data:${type};base64,${outBuff.toString(
                                  "base64"
                                )}`,
                                banner: `data:application/octet-stream;base64,${banner}`,
                              },
                              authPrefix: "",
                            });

                            console.log(`Done! ${src}`);
                          }
                        );
                      }
                    });
                })
                .catch(() => {});
            });
          });
        }
      });
  } catch (e) {
    console.log(e);
  }
};

setAvatar();

setInterval(async () => {
  await setAvatar();
}, 10 * 60 * 1000 + 1);

function fisherYatesShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getRandomElements(array, numElements) {
  const shuffledArray = fisherYatesShuffle(array.slice());
  return shuffledArray.slice(0, numElements);
}
