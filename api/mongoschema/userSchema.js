const mongoose = require('mongoose');

const Schema = mongoose.Schema;

let userSchema = new Schema(
  {
    publicKey: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      unique: true
    }
  }
  , {
    timestamps: true
  }
);


let User = mongoose.model('User', userSchema);

module.exports = User;
