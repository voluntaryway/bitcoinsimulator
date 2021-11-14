const mongoose = require('mongoose');
const transactionSchema = require('./transactionSchema').transactionSchema;
const Schema = mongoose.Schema;


let blockSchema = new Schema(
  {
    blockchain: {
      type: String,
      default: 'public'
    },
    transactions: [transactionSchema],
    previoushash: {
      type: String,
      required: true
    },
    nonce: {
      type: Number,
      required: true
    },
    difficulty: {
      type: Number,
      required: true
    },
    miner: {
      name: {
        type: String,
        required: true
      },
      publicKey: {
        type: String,
        required: true
      }
    },
    genesis: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);


let Block = mongoose.model('Block', blockSchema);

module.exports = Block;
