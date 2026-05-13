const mongoose = require('mongoose');

const uri = "mongodb://prabink721:%40Prabin123@ac-aqdosee-shard-00-00.czmnpub.mongodb.net:27017,ac-aqdosee-shard-00-01.czmnpub.mongodb.net:27017,ac-aqdosee-shard-00-02.czmnpub.mongodb.net:27017/toolsvault?ssl=true&replicaSet=atlas-13495d-shard-0&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("Connected directly!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
