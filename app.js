
const fs = require('fs');
const co = require('co');
const cfg = require("./config.json");
const CN  = require("./cn.js");
const CZ  = require("./parseCZData.js");
const getLoc  = require("./getloc.js");


function main()
{
  co(function* () {

      if( fs.existsSync( cfg.noHandleRec ) === false ){
          let cns = yield CN.parseCn( cfg.cn);
          //console.log( cns );

          let noChina = yield CN.parseNoChina( cfg.noChina);
          //console.log( noChina );

          let czs = yield CZ.parse( cfg.dataSrc );
          //console.log( czs );

          CN.makeCNData( czs,cns, noChina, cfg );
      }

      //
      getLoc.getRecsLocation( cfg);

  }).then(function (value) {
      console.log(" ---- handle success! ");
  }, function (err) {
    console.error(err.stack);
  });
}


main();




  