const BITBOX = new bitboxSdk.BITBOX({ restURL: 'https://rest.bitcoin.com/v2/' });
const bitboxNetwork = new slpjs.BitboxNetwork(BITBOX);

function lookupTokens() {
  document.getElementById("lookup").disabled = true;
  document.getElementById("lookup").innerHTML = "Loading";


  let addr = document.getElementById("publickey").value;

  let balances;

  //TODO validate all input coming from BitBox server to ensure it has not been compromised to send malicious code
  (async function () {
    balances = await bitboxNetwork.getAllSlpBalancesAndUtxos(addr);
    document.getElementById("lookup").innerHTML = "Finished lookup";
    let slputxos = balances.slpTokenUtxos;
    let utxoCheckboxes = "<form>";

    for (var key in slputxos) {
      document.getElementById("lookup").innerHTML = "Lookup " + key;

      //console.log(slputxos[key]);
      const tokenInfo = await bitboxNetwork.getTokenInformation(key);
      let slps = slputxos[key];
      utxoCheckboxes = utxoCheckboxes + 
      "<br/><a target='tokeninfo' href='" + tokenInfo.documentUri + "'>" + tokenInfo.name + "</a> <a target='memotokeninfo' href='https://memo.cash/token/"+key+"?sales'>Recent Sales On Memo</a><br/>";
      
      for (let i = 0; i < slps.length; i++) {
        //utxoCheckboxes = utxoCheckboxes + tokenInfo.name + " " + slps[i].satoshis + " " + slps[i].txid + " " + slps[i].vout + " " + slps[i].satoshis + " " + slps[i].slpUtxoJudgementAmount["c"][0] + "<br/>";
        let amount = (slps[i].slpUtxoJudgementAmount["c"][0] / Math.pow(10, tokenInfo.decimals));
        utxoCheckboxes = utxoCheckboxes + "<input type='checkbox' name='token' value='" + slps[i].txid + "," + slps[i].vout + "," + slps[i].satoshis + "'>" + amount + " " + tokenInfo.symbol + "</input><br/>";
        document.getElementById("checkboxes").innerHTML = utxoCheckboxes;
      }
    }

    utxoCheckboxes = utxoCheckboxes + "</form><br/><br/>";
    document.getElementById("checkboxes").innerHTML = utxoCheckboxes;


    document.getElementById("private").style.display = "block";


    document.getElementById("lookup").disabled = false;
    document.getElementById("lookup").innerHTML = "Lookup";
  })();

}

function recycle(checkedBoxes) {

  var checkedBoxes = document.querySelectorAll('input[name="token"]:checked');

  let pubkey = document.getElementById("publickey").value;
  let privkey = document.getElementById("privatekey").value;

  let tx = constructTransaction(checkedBoxes, 0, pubkey, privkey);
  let transactionSize = tx.byteLength();
  //Add 5 extra satoshis for safety
  let fees = transactionSize + 5;

  //Make the trx again, with fees included
  tx = constructTransaction(checkedBoxes, fees, pubkey, privkey);

  //BROADCAST THE TRANSACTION
  let hex = tx.toHex();
  // sendRawTransaction to running BCH node

  const RawTransactions = BITBOX.RawTransactions;
  //let rawtransactions = new RawTransactions();
  RawTransactions.sendRawTransaction(hex).then((result) => {
    console.log(result);
    alert("trxid:"+result);
  }, (err) => {
    console.log(result);
    alert("Error:"+result);
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