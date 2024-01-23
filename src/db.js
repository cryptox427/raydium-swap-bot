const sqlite3 = require("sqlite3");
const { TEST_LOOP } = require("./config");
const globalStore = require("./globalStore");

const db = new sqlite3.Database("./data.db", (err) => {
  if (err) {
    console.error("Erro opening database " + err.message);
  } else {
    db.run(
      "CREATE TABLE records (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
         token_address NVARCHAR(50) NOT NULL, \
         token_symbol NVARCHAR(10), \
         token_decimal INTEGER, \
         pool_address NVARCHAR(50), \
         liquidity REAL, \
         buy_time INTEGER, \
         buy_amount REAL, \
         sell_time INTEGER, \
         price_at_buy REAL, \
         price_at_sell REAL, \
         test_loop INTEGER DEFAULT 0, \
         usage BOOLEAN)",
      (err) => {
        if (err) {
          console.log(`DB access error: ${err}`);
        }
      }
    );
  }
});

const addNewToken = (token_address, pool_address, decimal) => {
  db.run(
    "INSERT INTO records (token_address, pool_address, token_decimal, usage) VALUES (?, ?, ?, ?)",
    [token_address, pool_address, decimal, true],
    function (err, result) {
      if (err) {
        console.error(`Error while adding a new token to DB: ${err}`);
        return;
      }
      globalStore.set("newTokenAvailable", false);
      console.log(`New token added to DB: ${token_address}`);
    }
  );
};

const getNewTokens = (callback) => {
  db.all(
    `SELECT * FROM records where usage IS NULL OR test_loop < ${TEST_LOOP}`,
    [],
    (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, rows);
    }
  );
};

const filterTokenRecords = (
  token_address,
  token_symbol,
  pool_address,
  liquidity,
  price_at_buy,
  usage
) => {
  db.run(
    "UPDATE records set token_symbol = ?, pool_address = ?, liquidity = ?, price_at_buy = ?, usage = ?, test_loop = test_loop + 1 WHERE token_address = ?",
    [token_symbol, pool_address, liquidity, price_at_buy, usage, token_address],
    function (err, result) {
      if (err) {
        console.error(`Error while updating DB record: ${err}`);
        return;
      }

      console.log(`Successfully updated: ${this.changes}`);
    }
  );
};

const getBuyables = (callback) => {
  db.all(
    `SELECT * FROM records where usage is true and buy_time is NULL`,
    [],
    (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, rows);
    }
  );
};

const getSellables = (callback) => {
  db.all(
    `SELECT * FROM records where usage IS true and buy_time < strftime('%s', 'now', '-1 minute') * 1000 and sell_time is NULL`,
    [],
    (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }
      globalStore.set("newTokenAvailable", true);
      callback(null, rows);
    }
  );
};

const updateBuyInfo = (buy_amount, token_address) => {
  db.run(
    "UPDATE records set buy_time = ?, buy_amount = ? WHERE token_address = ?",
    [Date.now(), buy_amount, token_address],
    function (err, result) {
      if (err) {
        console.error(`Error while adding buy info: ${err}`);
        return;
      }

      console.log(`Successfully updated: ${this.changes}`);
    }
  );
};

const updateSellInfo = (token_address) => {
  db.run(
    "UPDATE records set sell_time = ? WHERE token_address = ?",
    [Date.now(), token_address],
    function (err, result) {
      if (err) {
        console.error(`Error while adding sell info: ${err}`);
        return;
      }

      console.log(`Successfully updated: ${this.changes}`);
    }
  );
};

module.exports = {
  addNewToken,
  getNewTokens,
  filterTokenRecords,
  getBuyables,
  updateBuyInfo,
  getSellables,
  updateSellInfo,
};
