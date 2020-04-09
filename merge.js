const fs = require('fs');
const pathC = require('path');
const ipC = require('ip');
const co = require('co');
const readline = require('readline');
const cfg = require("./config.json");


function get_file( recs, fileName, cb ){
    let readRl = readline.createInterface({
      input: fs.createReadStream( fileName),
      historySize:0
    }); 
    readRl.on('line', (line)=>{  
        //var tmp = 'line' + index.toString() + ':' + line;  
        let detail = line.split(' ');
        if( detail.length === 14 ){
          detail[2] = parseInt( detail[2] );
          detail[3] = parseInt( detail[3] );
          recs.push( detail );
        }
    });
  
    readRl.on('close', ()=>{  
        cb( fileName );
    });
  }

function loadBin( ){
    
    return new Promise( (resolve, reject )=>{
    let bins = [];
    let dir = pathC.dirname( cfg.savePath);
    let files = fs.readdirSync( dir );
    for(let i=0;i<files.length;i++){
        let fileName = pathC.basename( files[i] );
        let ext = pathC.extname( files[i] );
        if( ext === '.bin' ){
            bins.push( pathC.join(dir , files[i]) );
        }
    }

    let recs = [];
    let readOK = 0;
    // 读取所有文件的记录
    for( let i=0;i<bins.length; i++ )
    { 
        get_file( recs,bins[i], function(){
            readOK++;
            if( readOK === bins.length ){
                resolve( recs);
            }
        });
    }
    });

}

/** 排序 */
function sort_bin( rec0,rec1 )
{
    return rec0[2] - rec1[2];
}

function makeData()
{
  co(function* () {
    console.log("数据读取中...");
    let recsTT = yield loadBin();
    
    /// 排序
    console.log( "排序,合并..." );
    recsTT.sort( sort_bin );
    
    console.log("开始去重");

    /// 去重
    let recs = [];
    let linePre = recsTT[0];
    let lineNow = [];
    for( let i=1; i<recsTT.length;i++ )
    {
        if( i %100000 === 0 ){
            console.log("去重中...", recsTT.length-i);
        }
        lineNow = recsTT[i];
        if( lineNow[2] !== linePre[2] ){
            recs.push( linePre );
            linePre = lineNow;
        }
    }

    recs.push(linePre);
    recsTT = undefined;

    let recsNew = [];
    /// 合并
    console.log("开始合并....");
    linePre = recs[0];
    lineNow = [];

    let mergeMode = 12;
    if( cfg.merge.mode == "areaANDisp" ){
        mergeMode = 14;
    }else if( cfg.merge.mode == "city" ){
        mergeMode = 10;
    }

    for( let i=1; i<recs.length;i++ )
    {
        if( i %100000 === 0 ){
            console.log("合并中...", recs.length-i);
        }

        lineNow = recs[i];
        let bMerge = true;
        if( lineNow[2] - linePre[3] === 1 ){
            for( let j=4;j<mergeMode;j++ ){
              if( lineNow[j] !== linePre[j] ){
                 bMerge = false;
              }
            }
        }else{
          bMerge = false;
        }

        if( bMerge ){
            linePre[3] = lineNow[3];
        }else{
            recsNew.push( linePre );
            linePre = lineNow;
        }
    }

    recsNew.push( linePre );

    console.log( `原记录数:${recs.length}  合并后记录数：${recsNew.length}` );
    recs = undefined;
    console.log( "写数据文件" );

    if(cfg.merge === undefined || cfg.merge.splitFile === 0 ) {
      let fd = fs.openSync( cfg.merge.out , 'w' );
      for( let i=0;i<recsNew.length; i++ )
      {
        let t = recsNew[i];
        let loc = {
          sip : t[0],
          eip : t[1],
          sVal: t[2],
          eVal:t[3],
          country:t[4],
          country_id:t[5],
          region:t[6],
          region_id:t[7],
          city:t[8],
          city_id:t[9],
          county:t[10],
          county_id:t[11],
          isp:t[12],
          isp_id:t[13]
        };

        let msg = eval( cfg.merge.template ) + "\n";
        fs.writeSync( fd, msg);
      }

      fs.closeSync( fd);
    } else {
      let fileIdx = 0;
      let nNum = 1;
      let fd = fs.openSync( `${cfg.merge.out}${fileIdx}` , 'w' );
      for( let i=0;i<recsNew.length; i++ )
      {
        if( nNum === 1 ){
          fs.writeSync( fd, "BEGIN TRANSACTION\n\n");
        }


        let t = recsNew[i];
        let loc = {
          sip : t[0],
          eip : t[1],
          sVal: t[2],
          eVal:t[3],
          country:t[4],
          country_id:t[5],
          region:t[6],
          region_id:t[7],
          city:t[8],
          city_id:t[9],
          county:t[10],
          county_id:t[11],
          isp:t[12],
          isp_id:t[13]
        };

        let msg = eval( cfg.merge.template ) + "\n";
        fs.writeSync( fd, msg);

        nNum++;
        if( nNum > cfg.merge.splitFile ){
          fs.writeSync( fd, "\nCOMMIT TRANSACTION\n\n");

          fs.closeSync( fd);
          fd = null;

          if( i !== recsNew.length -1 ){
            fileIdx++;
            nNum=1;
            fd = fs.openSync( `${cfg.merge.out}${fileIdx}` , 'w' );
          }
        }
      }
      if( fd !== null ){
        fs.writeSync( fd, "\nCOMMIT TRANSACTION\n\n");
        fs.closeSync( fd);
      }
    }
  
    return recsNew.length;
  }).then(function (value) {
  }, function (err) {
    console.error(err.stack);
  });   
}

makeData();