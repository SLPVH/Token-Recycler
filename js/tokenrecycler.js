const BITBOX = new bitboxSdk.BITBOX({ restURL: 'https://rest.bitcoin.com/v2/' });
const bitboxNetwork = new slpjs.BitboxNetwork(BITBOX);

function lookupTokens() {
  document.getElementById("checkboxes").innerHTML = "";
  document.getElementById("lookup").disabled = true;
  document.getElementById("publickey").disabled = true;
  document.getElementById("lookup").innerHTML = "Loading";
  document.getElementById("private").style.display = "none";
  

  let addr = document.getElementById("publickey").value.trim();

  let balances;

  //TODO validate all input coming from BitBox server to ensure it has not been compromised to send malicious code
  (async function () {
    try {
      balances = await bitboxNetwork.getAllSlpBalancesAndUtxos(addr);
    } catch (err) {
      alert("Oops. Error. You sure you got a valid public key? " + err);
      document.getElementById("lookup").disabled = false;
      document.getElementById("publickey").disabled = false;
      document.getElementById("lookup").innerHTML = "Lookup SLP Tokens";
      return;
    }

    document.getElementById("lookup").innerHTML = "Finished lookup";
    let slputxos = balances.slpTokenUtxos;
    let utxoCheckboxes = "<form>";

    for (var key in slputxos) {
      let keysafe=sanitizeAlphanumeric(key);
      document.getElementById("lookup").innerHTML = "Lookup " + keysafe.substring(0,10)+"...";

      try {
        //To stay within Bitbox usage limits
        sleep(1000);
        const tokenInfo = await bitboxNetwork.getTokenInformation(keysafe);
        let slps = slputxos[keysafe];
        utxoCheckboxes = utxoCheckboxes +
          "<br/><b>" + ds(tokenInfo.name) + "</b><br/> (" + ds(tokenInfo.documentUri) + ") | <a rel='noopener noreferrer' target='memberdiscussion' href='https://memberapp.github.io/#thread?post=" + keysafe + "'>Member Discussion</a> | <a rel='noopener noreferrer' target='memotokeninfo' href='https://memo.cash/token/" + keysafe + "?sales'>Recent Sales On Memo</a><br/>";

        for (let i = 0; i < slps.length; i++) {
          //utxoCheckboxes = utxoCheckboxes + tokenInfo.name + " " + slps[i].satoshis + " " + slps[i].txid + " " + slps[i].vout + " " + slps[i].satoshis + " " + slps[i].slpUtxoJudgementAmount["c"][0] + "<br/>";
          let amount = (Number(slps[i].slpUtxoJudgementAmount["c"][0]) / Math.pow(10, Number(tokenInfo.decimals)));
          utxoCheckboxes = utxoCheckboxes + "<input type='checkbox' name='token' value='" + sanitizeAlphanumeric(slps[i].txid) + "," + Number(slps[i].vout) + "," + Number(slps[i].satoshis) + "'>" + amount + " " + ds(tokenInfo.symbol) + "</input><br/>";
          document.getElementById("checkboxes").innerHTML = utxoCheckboxes;
        }
      } catch (err) {
        console.log(err);
        utxoCheckboxes = utxoCheckboxes + "Error loading these tokens:" + err;
        document.getElementById("checkboxes").innerHTML = utxoCheckboxes;
        //Error proccessing this token, move on
        
      }
    }

    utxoCheckboxes = utxoCheckboxes + "</form><br/><br/>";
    document.getElementById("checkboxes").innerHTML = utxoCheckboxes;
    document.getElementById("private").style.display = "block";
    document.getElementById("lookup").innerHTML = "Lookup";
  })();

}

function recycle(checkedBoxes) {

  var checkedBoxes = document.querySelectorAll('input[name="token"]:checked');

  if (checkedBoxes.length < 1) {
    alert("Oops. No tokens selected. You must select 2 or more tokens to recycle.");
    return;
  }

  if (checkedBoxes.length == 1) {
    alert("Oops. You must select 2 or more tokens to recycle.");
    return;
  }

  let pubkey = document.getElementById("publickey").value.trim();  
  let privkey = document.getElementById("privatekey").value.trim();

  let tx;
  try {
    tx = constructTransaction(checkedBoxes, 0, pubkey, privkey);
    let transactionSize = tx.byteLength();
    //Add 5 extra satoshis for safety
    let fees = transactionSize + 5;

    //Make the trx again, with fees included
    tx = constructTransaction(checkedBoxes, fees, pubkey, privkey);

  } catch (err) {
    alert("Oops. Error constructing transaction. You sure your privkey is valid and matches your pubkey? " + err);
  }


  //BROADCAST THE TRANSACTION
  let hex = tx.toHex();
  // sendRawTransaction to running BCH node

  const RawTransactions = BITBOX.RawTransactions;
  //let rawtransactions = new RawTransactions();
  RawTransactions.sendRawTransaction(hex).then((result) => {
    document.getElementById("successtrxid").innerHTML = "<a target='blockchair' href='https://blockchair.com/bitcoin-cash/transaction/" + sanitizeAlphanumeric(result) + "'> Blockchair " + sanitizeAlphanumeric(result) + "</a>";
    document.getElementById("private").style.display = "none";
    alert("Success! trxid:" + result);
    console.log(result);
  }, (err) => {
    alert("Error Broadcasting Transaction:" + err);
    console.log(err);
    console.log(err.message);
  });

}

function constructTransaction(checkedBoxes, transactionFee, publicAddress, privateKey) {

  //const ECPair = BITBOX.ECPair;
  let keyPair = BITBOX.ECPair.fromWIF(privateKey);


  const TransactionBuilder = BITBOX.TransactionBuilder;
  let transactionBuilder = new TransactionBuilder();

  let totalInput = 0;
  for (let i = 0; i < checkedBoxes.length; i++) {
    let utxoComponents = checkedBoxes[i].value.split(",");
    totalInput += Number(utxoComponents[2]);
    // index of vout
    let vout = Number(utxoComponents[1]);
    // txid of vout
    let txid = utxoComponents[0];
    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);
  }

  //Send the whole amount minus trx fee to address
  transactionBuilder.addOutput(publicAddress, totalInput - transactionFee);

  //Sign inputs
  for (let i = 0; i < checkedBoxes.length; i++) {
    let utxoComponents = checkedBoxes[i].value.split(",");
    let redeemScript;
    transactionBuilder.sign(i, keyPair, redeemScript, transactionBuilder.hashTypes.SIGHASH_ALL, Number(utxoComponents[2]));
  }

  // build tx
  let tx = transactionBuilder.build();
  return tx;

}

function ds(input) {
  //if (input === undefined) { return ""; };
  try {
    //If this error out 'input.replace not a number' probably input is not a string type
    input = input.replace(/&/g, '&amp;');
    input = input.replace(/</g, '&lt;');
    input = input.replace(/>/g, '&gt;');
    input = input.replace(/"/g, '&quot;');
    input = input.replace(/'/g, '&#x27;');
  } catch (e) {
    //Anything funky goes on, we'll return safe empty string
    return "";
  }
  return input;
}

function sanitizeAlphanumeric(input) {
  if (input == null) { return ""; }
  return input.replace(/[^A-Za-z0-9]/g, '');
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
