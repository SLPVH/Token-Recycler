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
      let slps=slputxos[key];
      utxoCheckboxes = utxoCheckboxes + "<br/><a target='tokeninfo' href='"+tokenInfo.documentUri+"'>" + tokenInfo.name + "</a><br/>";
      for(let i=0;i<slps.length;i++){
        //utxoCheckboxes = utxoCheckboxes + tokenInfo.name + " " + slps[i].satoshis + " " + slps[i].txid + " " + slps[i].vout + " " + slps[i].satoshis + " " + slps[i].slpUtxoJudgementAmount["c"][0] + "<br/>";
        document.getElementById("checkboxes").innerHTML = utxoCheckboxes;
        let amount = (slps[i].slpUtxoJudgementAmount["c"][0]/Math.pow(10,tokenInfo.decimals));
        utxoCheckboxes = utxoCheckboxes + "<input type='checkbox' value='"+slps[i].txid+"'>"+amount+" "+tokenInfo.symbol+"</input></br>";
      }
    }

    document.getElementById("lookup").disabled=false;
    document.getElementById("lookup").innerHTML="Lookup";
  })();

}