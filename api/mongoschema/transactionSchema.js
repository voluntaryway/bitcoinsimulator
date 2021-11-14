const mongoose = require('mongoose');

const Schema = mongoose.Schema;

let transactionSchema = new Schema(
  {
    blockchain: {
      type: String,
      default: 'public'
    },
    sender: {
      name: {
        type: String,
        required: true
      },
      publicKey: {
        type: String,
        required: true
      }
    },
    recipient: {
      name: {
        type: String,
        required: true
      },
      publicKey: {
        type: String,
        required: true
      }
    },
    amount: Number,
    signature: {
      type: String,
      required: true
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


let Transaction = mongoose.model('Transaction', transactionSchema);

module.exports =  {
  Transaction: Transaction,
  transactionSchema: transactionSchema
};
