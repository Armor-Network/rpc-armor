/**
*
*     _      ____    __  __    ___    ____      _   _   _____   _____
*    / \    |  _ \  |  \/  |  / _ \  |  _ \    | \ | | | ____| |_   _|
*   / _ \   | |_) | | |\/| | | | | | | |_) |   |  \| | |  _|     | |
*  / ___ \  |  _ <  | |  | | | |_| | |  _ <    | |\  | | |___    | |
* /_/   \_\ |_| \_\ |_|  |_|  \___/  |_| \_\   |_| \_| |_____|   |_|
*
*
*	ARMOR NETWORK
*	A fast, easy and anonymous payment system.
*	https://armornetwork.org
*
**/

// Load required modules
var http = require('http');
var https = require('https');
var btoa = require('btoa');
var async = require('async');
var filter = require('filter-array');
const inquirer = require('inquirer');
const fs = require('fs');
let ascii_text_generator = require('ascii-text-generator');

// Global variables
var config;
var host;
var port;
var httpPassword;
var fee_per_byte = 100;
var paranoid_check = false;
var mixin = 3;
var destination_address = "";
var spend_address = "";
var change_address = "";
var amount = 1; //atomic units
var any_spend_address = false;

var validatenumber = function (input) {
  if (isNaN(input)) {
    return 'You need to provide a number';
  }
  return true;
};

var validatepositivenumber = function (input) {
  if (isNaN(input) || input <= 0) {
    return 'You need to provide a number > 0';
  }
  return true;
};

var readConfFile = function (file, callback) {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        console.log(`\x1b[31mError reading ./config.json from disk: ${err}\x1b[0m`);
        process.exit(1);
      } else {
        console.log(`config.json read correctly.\n`);
        callback(JSON.parse(data));
      }
    });
}

function jsonHttpRequest(host, port, data, callback, path, http_auth){
    path = path || '/json_rpc';
    callback = callback || function(){};

    var options = {
        hostname: host,
        port: port,
        path: path,
        method: data ? 'POST' : 'GET',
        headers: {
            'Content-Length': data.length,
            'Content-Type': 'application/json',
            'Accept': 'application/json'//,
            //'Authorization': "Basic " + btoa("user:password")
        }
    };

    if(http_auth)
    {
        options = {
        hostname: host,
        port: port,
        path: path,
        method: data ? 'POST' : 'GET',
        headers: {
            'Content-Length': data.length,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': "Basic " + btoa(httpPassword)
        }
        };
    }

    var req = (port === 443 ? https : http).request(options, function(res){ // TODO
        var replyData = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            replyData += chunk;
        });
        res.on('end', function(){
            var replyJson;
            try{
                replyJson = JSON.parse(replyData);
            }
            catch(e){
                callback(e, {});
                return;
            }
            callback(null, replyJson);
        });
    });

    req.on('error', function(e){
        callback(e, {});
    });

    req.end(data);
}

function rpc(host, port, method, params, callback, http_auth){
    var data = JSON.stringify({
        id: "0",
        jsonrpc: "2.0",
        method: method,
        params: params
    });
    jsonHttpRequest(host, port, data, function(error, replyJson){
        if (error){
            callback(true, replyJson);
            return;
        }
        callback(replyJson.error, replyJson.result || replyJson)
    }, '/json_rpc', http_auth);
}


function rpcWallet(method, params, callback){
    var http_auth = true;//TODO
    rpc(host, port, method, params, callback, http_auth);
}

var getblockheaderbyheight = function(h,callback){
  rpcWallet('getblockheaderbyheight', { height: h } , function (error, result) {
    if (error || !result) {
			callback(true, result || {})
      return;
    }
    callback(false, result)
  })
}

var get_addresses = function(callback){
    rpcWallet('get_addresses', {} , function (error, result) {
      if (error || !result) {
  			callback(true, result || {})
        return;
      }
      callback(false, result)
    })
};

var get_balance = function(params, callback){
    rpcWallet('get_balance', params , function (error, result) {
      if (error || !result) {
  			callback(true, result || {})
        return;
      }
      callback(false, result)
    })
};

var get_status = function(callback){
    rpcWallet('get_status', {} , function (error, result) {
      if (error || !result) {
  			callback(true, result || {})
        return;
      }
      callback(false, result)
    })
};

var create_addresses = function(params, callback){
    rpcWallet('create_addresses', params , function (error, result) {
      if (error || !result) {
        callback(true, result || {})
        return;
      }
      callback(false, result)
    })
};

function createTransaction(command, callback) {
  rpcWallet('create_transaction', command.rpc, function (error, result) {
    if (error || !result) {
  		if(result.error)
        callback(true,result.error.message || result);
  		else
  			callback(true,result || {});
        return;
    }
    command.tx.binary_transaction = result.binary_transaction;
    command.created = true;
    command.hash = result.transaction.hash;
    callback(false, command);
  })
}

function sendTransaction(command, callback) {
  if (!command.created) {
    callback(true, "Transaction not created.");
    return;
  }
  rpcWallet('send_transaction', command.tx, function (error, result) {
    if (error || !result) {
      callback(true, result);
      return;
    }
    if (result.send_result != "broadcast") {
      callback(true,result.send_result);
      return;
    }
    command.sent = true;
    callback(false, command);
  });
}

function submit(cb) {

  var transferCommand = {
    amount: 0,
    tx: {
      binary_transaction: ""
    },
    created: false,
    sent: false,
    hash: "",
    rpc: {
      fee_per_byte: fee_per_byte,
      transaction:
      {
        anonymity: mixin,
        payment_id: "",
        transfers: [],
      },
      optimization: optimization,
      spend_addresses: [spend_address],
      any_spend_address: any_spend_address,
      change_address: change_address
    }
  };

  transferCommand.rpc.transaction.transfers.push({ amount: amount, address: destination_address });

  async.waterfall([
    function (callback) {
		  if(paranoid_check){
			  callback(true, "Error paranoid_check");
			  return;
		  }
		  paranoid_check = true;
      createTransaction(transferCommand, function (error, result) {
        if (error || !result) {
  				console.log(result);
  			  paranoid_check = false;
  			  callback(true, result);
          return;
        }
        callback(null,result);
      })
    },
    function (command, callback) {
      sendTransaction(command, function (error, result) {
        if (error || !result) {
          console.log("Error sendTransaction");
          if(result)
  			    console.log(result);
            callback(true, result);
            return;
          }
			  console.log(transferCommand.hash);
			  paranoid_check = false;
        callback(null, result);
      })
    }
    ],function (error, result) {
        if (error) {
          console.log(`\x1b[31mError ${error}\x1b[0m`);
        }else{
			    console.log("\x1b[1m\x1b[32mSent!");
		    }
        cb(error,result);
    });
} // submit

function run() {

  console.log("\n" + ascii_text_generator("Armor","2"));
  console.log("\n" + ascii_text_generator("Network","2"));
  console.log("\nA fast, easy and anonymous payment system."
              + "\nhttps://armornetwork.org\n");

  readConfFile("./config.json", function(config) {
    port = config.walletd.port;
    host = config.walletd.host;
    httpPassword = config.walletd.httpPassword;

    var queries = ["See balance", "My addresses", "Send transaction", "Get status", "Create address", "Exit"];

    const ask = () => {

      var addresses;

      get_addresses(function(error, result) {
        if(error){
          console.log(`\x1b[31merror ${result}\x1b[0m`);
          return;
        }
        addresses = result.addresses;

        inquirer.prompt([
        {
          name: 'query',
          type: 'list',
          message: 'query?',
          choices: queries,
          default: "balance",
        }]).then((answers) => {
          if(answers.query == queries[0]) {
            addresses.push("all")
            inquirer.prompt([
            {
              name: 'address',
              type: 'list',
              message: 'What address? [all for all addresses]',
              choices: addresses,
              default: "all",
            }]).then((answers) => {
              get_balance(answers.address == "all" ? {} : { address: answers.address },function(error, result){
                if(error){
                console.log(`\x1b[31merror ${result}\x1b[0m`);
                } else {
                  console.log(`
                    Spendable: ${result.spendable}[atomic units] => ${(result.spendable/100000000).toFixed(8)}[AMX]
                    Spendable dust: ${result.spendable_dust}[atomic units] => ${(result.spendable_dust/100000000).toFixed(8)}[AMX]
                    Locked or unconfirmed: ${result.locked_or_unconfirmed}[atomic units] => ${(result.locked_or_unconfirmed/100000000).toFixed(8)}[AMX]`);
                  console.log(`\x1b[2m
                    Spendable outputs: ${result.spendable_outputs}
                    Spendable dust outputs: ${result.spendable_dust_outputs}
                    Locked or unconfirmed outputs: ${result.locked_or_unconfirmed_outputs}\x1b[0m`);
                  ask();
                }
              })
            })
          } else if (answers.query == queries[1]){
              console.log(addresses);
              ask();
          } else if (answers.query == queries[2]){
                addresses.push("any")
                inquirer.prompt([{
                  name: 'destination',
                  type: 'input',
                  message: 'What\'s the destination address?',
                },{
                  name: 'spend',
                  type: 'list',
                  message: 'What\'s the spend address? [any for any spend address]',
                  choices: addresses,
                  default: "any",
                },{
                  name: 'anonymity',
                  type: 'number',
                  message: 'What anonymity? [default: 3]',
                  default: 3,
                  validate: validatenumber
                },{
                  name: 'optimisation',
                  type: 'list',
                  message: 'What type of optimization do you want? [default: normal]',
                  choices: ['minimal', 'normal', 'aggressive'],
                  default: 1,
                },{
                  name: 'amount',
                  type: 'input',
                  message: 'Amount? [atomic units] If you want to send 1 AMX then put 100000000 a.u.',
                  validate: validatepositivenumber
                }]).then((answers) => {
                    destination_address = answers.destination;
                    spend_address = answers.spend == "any" ? "" : answers.spend;
                    any_spend_address = answers.spend == "any" ? true : false;
                    change_address = answers.spend;
                    optimization = answers.optimisation;
                    amount = parseInt(answers.amount);
                    mixin = parseInt(answers.anonymity);

                    console.log(`\n\x1b[1m\x1b[32mDestination address: ${answers.destination}
                      Source address: ${answers.spend}
                      Anonymity: ${mixin}
                      Optimisation: ${optimization}
                      Amount: ${amount}[atomic units] => ${(amount/100000000).toFixed(8)}[AMX]\n`);

                    inquirer.prompt([{
                      name: 'submit',
                      type: 'confirm',
                      message: 'Submit?',
                      }]).then((ans) => {
                        if(ans.submit) {
                          submit(function(error,result){
                            ask();
                          });
                        } else {
                          console.log("Cancelled!");
                          ask();
                        }
                      })
                  })
            } else if(answers.query == queries[3]) {
              get_status(function(error, result){
                if(error){
                  console.log(`\x1b[31mError ${result}\x1b[0m`);
                } else {
                  console.log(result);
                }
                ask();
              })
            } else if(answers.query == queries[4]) {
              create_addresses({secret_spend_keys: [""]},function(error, result){
                if(error){
                  console.log(`\x1b[31mError ${result}\x1b[0m`);
                } else {
                  console.log(result);
                }
                ask();
              })
            } else if(answers.query == queries[5]) {
                process.exit(0);
            } else {
              console.log(`\x1b[31mError\x1b[0m`);
              ask();
            }
        })
      })
    }
    ask();
  })
}

run();
