/*
Run: node app.js CSV_LOCATION EXPRESSCART_BASE_DIR
Useful:
https://stackoverflow.com/questions/12740659/downloading-images-with-node-js
https://riptutorial.com/node-js/example/28457/using-fs-to-read-in-a-csv

*/
'use strict'

const fs = require('fs');
const axios = require('axios');

const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
const ObjectID = mongo.ObjectID;
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const makeDirAsync = promisify(fs.mkdir);

const download_image = (url, image_path) =>
  axios({
    url,
    responseType: 'stream',
  }).then(
    response =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(image_path))
          .on('finish', () => resolve())
          .on('error', e => reject(e));
      }),
  );

(async function () {
  // Connection URL
  const url = 'mongodb://localhost:27017/expresscart';
  // Database Name
  const dbName = 'expresscart';
  const client = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // Use connect method to connect to the Server
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection('products');
    //const products = await collection.find().toArray()
    const data = await readFileAsync(process.argv[2], 'utf8');
    var dataArray = data.split(/\r?\n/);
    // remove first line
    dataArray = dataArray.slice(1, -1)
    for (const line of dataArray) {
      // Create an id
      const id = new ObjectID();
      const fields = line.split(';');
      if (fields[1]) {
        //Create directory
        await makeDirAsync(`${process.argv[3]}/uploads/${id}`);
        //Download image
        await download_image(fields[1], `${process.argv[3]}/uploads/${id}/main.jpg`);
      }
      const title = fields[2].replace(/"/g, '');
      await collection.insertOne({
        _id: id,
        productPermalink: title.toLowerCase().replace(/ /g, '-'),
        productTitle: title,
        productPrice: fields[7],
        productDescription: title,
        productPublished: true,
        //productTags: fields[2].split(' '),
        productAddedDate: new Date(),
        productStock: fields[8],
        productImage: `/uploads/${id}/main.jpg`
      })
    }
  } catch (err) {
    console.log(err.stack);
  }

  client.close();
})();
