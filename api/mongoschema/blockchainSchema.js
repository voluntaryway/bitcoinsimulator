const mongoose = require('mongoose');
const Schema = mongoose.Schema;


let blockchainSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    difficulty: {
      type: Number,
      required: true,
      min: 2,
      max: 20
    },
    blockReward: {
      type: Number,
      required: true,
      min: 0
    },
    genesisReward: {
      type: Number,
      required: true,
      min: 0
    },
    truncated: {
      id: String,
      depth: Number,
      previousBalance: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);


let Blockchain = mongoose.model('Blockchain', blockchainSchema);

module.exports = Blockchain;
