function lookupTokens() {
  document.getElementById("lookup").disabled=true;
  document.getElementById("lookup").innerHTML="Loading";

  const BITBOX = new bitboxSdk.BITBOX({ restURL: 'https://rest.bitcoin.com/v2/' });
  const bitboxNetwork = new slpjs.BitboxNetwork(BITBOX);

  let addr = document.getElementById("publickey").value;

  let balances;
  (async function () {
    balances = await bitboxNetwork.getAllSlpBalancesAndUtxos(addr);
    document.getElementById("lookup").innerHTML="Finished lookup";
    let slputxos = balances.slpTokenUtxos;
    let utxoCheckboxes = "";

    for (var key in slputxos) {
      document.getElementById("lookup").innerHTML="Lookup "+key;
    
      //console.log(slputxos[key]);
      const tokenInfo = await bitboxNetwork.getTokenInformation(key);
      utxoCheckboxes = utxoCheckboxes + tokenInfo.name + "<br/>"
      document.getElementById("checkboxes").innerHTML = utxoCheckboxes;
    }

    document.getElementById("lookup").disabled=false;
    document.getElementById("lookup").innerHTML="Lookup";
  })();

}