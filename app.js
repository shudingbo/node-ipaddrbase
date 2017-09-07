
const readline = require('readline');
const http = require('http');
const querystring=require('querystring');  
const iconv = require('iconv-lite');
const fs = require('fs');
const ipC = require('ip');

const cfg = require("./config.json");

const REDIRECT_MODE_1 = 1;
const REDIRECT_MODE_2 = 2;


function showHelp(){
   console.log("------------------------------------");
   console.log(" x  quit this programe");
   console.log(" h  show help");
   console.log(" q  <IP addr>, query ip addr's location");
   console.log(" h  show help");
   console.log(" g  run command");
   console.log("------------------------------------");
}


//2个集合的差集 在arr不存在  
Array.prototype.minus = function (arr) {  
  var result = new Array();  
  var obj = {};  
  for (var i = 0; i < arr.length; i++) {  
      obj[arr[i]] = 1;  
  }  
  for (var j = 0; j < this.length; j++) {  
      if (!obj[this[j]])  
      {  
          obj[this[j]] = 1;  
          result.push(this[j]);  
      }  
  }  
  return result;  
}; 

function get_ip_location( ip ,cb )
{
  /////////
  const options = {
    host:'ip.taobao.com',  
    path:'/service/getIpInfo.php?ip='+ip,
    method: 'GET'
  };
  
  var request_timer = null,req = null;

  request_timer = setTimeout(function() {
      req.abort();
      //console.log('Request Timeout.');
  }, 5000);

  req = http.request(options, (res) => {
    clearTimeout(request_timer);

    var response_timer = setTimeout(function() {
      res.destroy();
      console.log('Response Timeout.');
    }, 1000);

    var chunks = [];
    res.on('data', (chunk) => {
      chunks.push(chunk);
    });
    res.on('end', () => {
      clearTimeout(response_timer);
      var decodedBody = eval("'" + iconv.decode(Buffer.concat(chunks), 'utf-8') +"'");
      if( cb !== undefined ){
        cb( null,decodedBody );
      }
    });
  });
  
  req.on('error', (e) => {
    clearTimeout(request_timer);
    cb( e.message, "" );
  });

  req.end();
}

let g_rec = [];

function readUIntLE(fd,g,w){
	g = g || 0;
	w = w < 1 ? 1 : w > 6 ? 6 : w;
	var buf = new Buffer(w);
	fs.readSync(fd,buf,0,w,g)
	return buf.readUIntLE(0,w)
}

//读取字节,直到为0x00结束,返回数组
function setIpFileString(fd,Begin){
	let B = Begin || 0,toarr = [], M;
	M =  fs.fstatSync(fd).size;
  B = B < 0 ? 0 : B;
  
  let buf = new Buffer(256);
  buf.fill(0);
  fs.readSync(fd,buf,0,256,B);
  let str = '';
  let len = 0;
	for(var i = 0 ; i < 256 ;i++){
    if( buf[i] === 0 ){
        let bufRet = new Buffer( i );
        buf.copy( bufRet, 0,0,i  );
        len = i+1;
        str = eval("'" +iconv.decode(bufRet, 'GBK') +"'");
        break;
    }
	}
	return [str,len];
}

function ReadArea(fd,offset){
	var one = readUIntLE(fd,offset,1);
	if (one == REDIRECT_MODE_1 || one == REDIRECT_MODE_2) {
		var areaOffset = readUIntLE(fd,offset + 1,3);
		if (areaOffset == 0)
			return '';
		else {
			return setIpFileString(fd,areaOffset)[0];
		}
	} else {
		return setIpFileString(fd,offset)[0];
	}
}

function parseIpData( filePath, cb )
{
    g_rec = [];
    let fd = fs.openSync( filePath , 'r');
    
    let buf = new Buffer(8); 
    let sOff = 0;
    let eOff = 0;
    let nRec = 0;

    let nRead = fs.readSync( fd, buf, 0,8, null);

    sOff = buf.readUInt32LE(0);
    eOff = buf.readUInt32LE(4);
    nRec = (eOff-sOff)/7;
    console.log( `${sOff}-${eOff} cnt:${nRec}` ); 

    let sIdx = Math.ceil( nRec * cfg.off[0]);
    let eIdx = Math.ceil( nRec * cfg.off[1]);
    if( cfg.off[1] === 1  ){
      eIdx = nRec;
    }
    console.log( `handle: ${sIdx} - ${eIdx} cnt:${ eIdx-sIdx }`  );
    ///////
     let recsT= [];  /// 临时用于后面去重
     let bufIdx = new Buffer(7);
     for( let i=sIdx;i<eIdx;i++ ){
        fs.readSync( fd, bufIdx, 0,7, sOff + 7*i);
        let ipStart = bufIdx.readUInt32LE(0);
        let ipEndOff =  bufIdx.readUIntLE(4,3);
        /// read endIP
        fs.readSync( fd, bufIdx, 0,4, ipEndOff);
        let ipEnd = bufIdx.readUInt32LE(0);
        
        /// 获取地址模式
        // fs.readSync( fd, bufIdx, 0,1, ipEndOff+4);
        // let mode =  bufIdx.readUIntLE(0,1);
        // let Country = "";
        // let Area    = "";
        // let ipwz = ipEndOff + 4;
        // //console.log( ipC.fromLong(ipStart) );
        // if( mode == REDIRECT_MODE_1 ){ //Country根据标识再判断
        //     ipwz = readUIntLE(fd,ipwz + 1,3); //读取国家偏移
        //     let lx = readUIntLE(fd,ipwz,1); //再次获取标识字节
        //     if (lx == REDIRECT_MODE_2){//再次检查标识字节
        //       Country = setIpFileString(fd,readUIntLE(fd,ipwz+1,3))[0];
        //       ipwz = ipwz + 4;
        //     }else{
        //       let loc = setIpFileString(fd,ipwz);
        //       Country = loc[0];
        //       ipwz += loc[1];
        //     }
        //     Area = ReadArea(fd,ipwz);
        // }else if( mode == REDIRECT_MODE_2 ) //Country直接读取偏移处字符串
        // {
        //     Country = setIpFileString(fd,readUIntLE(fd,ipwz+1,3))[0];
        //     Area = ReadArea(fd,ipwz + 4);
        // }else{//Country直接读取 Area根据标志再判断
        //   let loc = setIpFileString(fd,ipwz);
        //   ipwz += loc[1];
        //   Country = loc[0];
        //   Area = ReadArea(fd,ipwz);
        // }
        ///
        recsT.push( [ipStart, ipEnd]);
        //console.log( ipStart, ipEnd,ipC.fromLong(ipStart),ipC.fromLong(ipEnd), Country, Area );
     }
     fs.closeSync( fd);

     //////////// 合并临近项


     /////
     let recSIP = [];
     let recEIP = [];

     for( let i=0;i<recsT.length;i++ ){
        recSIP.push( recsT[i][0] );
        recEIP.push( recsT[i][1] );
     }

     //////////// 读取进度
     let progress = load_progress();
     let recs = [];
     let recDet = recSIP.minus( progress );

     if( progress.length === 0 ){
        let fd = fs.openSync( cfg.savePath , 'w' );
        fs.close( fd );
     }

     let i=0,j=0;
     for( i=0;i<recDet.length;i++)
      {
          for( j=0;j<recSIP.length;j++ ){
              if( recSIP[j] == recDet[i] ){
                recs.push( [ipC.fromLong(recSIP[j]), ipC.fromLong(recEIP[j])]);
                break;
              }
          }
      }

     g_rec = recs;
     console.log("--- 解析完成，开始获取记录信息, 数量：", g_rec.length);
     cb();
}

function writeRecord( rec, loc  )
{
  if( loc.country === ''  ) { loc.country = '-1'; }
  if( loc.country_id === ''  ) { loc.country_id = '-1'; }
  if( loc.region === ''  ) { loc.region = '-1'; }
  if( loc.region_id === ''  ) { loc.region_id = '-1'; }
  if( loc.city === ''  ) { loc.city = '-1'; }
  if( loc.city_id === ''  ) { loc.city_id = '-1'; }
  if( loc.county === ''  ) { loc.county = '-1'; }
  if( loc.county_id === ''  ) { loc.county_id = '-1'; }
  if( loc.isp === ''  ) { loc.isp = '-1'; }
  if( loc.isp_id === ''  ) { loc.isp_id = '-1'; }
  //console.log( loc );

  let fd = fs.openSync( cfg.savePath , 'a+' );
  let sIP = ipC.toLong( rec[0] );
  let eIP = ipC.toLong( rec[1] );
  let msg = `${rec[0]} ${rec[1]} ${sIP} ${eIP} ${loc.country} ${loc.country_id} ${loc.region} ${loc.region_id} ${loc.city} ${loc.city_id} ${loc.county} ${loc.county_id} ${loc.isp} ${loc.isp_id}\n`;
  fs.writeSync( fd, msg);
  fs.closeSync( fd);

  write_progress( sIP );
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let g_bPauseRL = false;

/** 写进度 
 * @param recIdx 记录成功获取信息的起始IP地址
*/
function write_progress( recSIP )
{
  let fd = fs.openSync( cfg.progressFile , 'a' );
  fs.writeSync( fd, `${recSIP}\n`);
  fs.closeSync( fd);
}

/** 读取进度
 * @return 返回已经成功获取的记录的起始IP地址
*/
function load_progress()
{
  try{
    let ret = fs.readFileSync(cfg.progressFile);
    console.log( ret );
    return ret.toString().split('\n');
  }catch( e ){
    return [];
  }
}

function get_locs()
{
  if( g_rec.length > 0 ){
      let rec = g_rec.shift();
      get_ip_location( rec[0] , function( err,loc ){
        let bTimeOut = cfg.freq;
        if(err !== null){
           bTimeOut = bTimeOut*2;
           console.log( err,rec );
           g_rec.push( rec );
        }else{
          if( g_rec.length % cfg.progressDis === 0 ){
              console.log( g_rec.length );
          }
          
          //console.log( rec, loc );
          let obj = JSON.parse(loc);
          if( obj.code === 0 ){
            writeRecord( rec, obj.data );
          }else{
            g_rec.push( rec );
          }
        }
          
        if( g_rec.length > 0 ){
            setTimeout( function(){
            get_locs();
          }, bTimeOut);
        }else{
          rl.resume();
        }
      });
  }else{
    rl.resume();
  }
}


function main()
{
    showHelp();
    rl.setPrompt('ipq>');
    rl.prompt();
    rl.on('line',(line)=>{

        let lineT = line.trim();
        let cmd = lineT.substring(0,1);
        switch(cmd){
          case 'x':
          {
            rl.close();
          }break;
          case 'h':
          {
              showHelp();
          }break;
          case 'q':
          {
            rl.pause();
            let ip = lineT.substring(2);
            get_ip_location(ip,  ( err,data )=>{
                let obj = JSON.parse(data);
                if( obj.code === 0 ){
                  console.log("Location:", obj.data);
                }else{
                  console.log("不能解析");
                }
                rl.resume();
            });
          }break;
          case 'g':
          {
            rl.pause();
            console.log( "start Handle ...!", cfg );
            parseIpData( cfg.dataSrc,function(){
                setTimeout( function(){
                    get_locs();
                },1000);
            });
          }break;
          default:{
            console.log('not find cmd');
          }break;
          
        }

      if( g_bPauseRL === false ){
        rl.prompt();
      }
      
    });
    
    rl.on('close',function(){
      console.log('欢迎下次再来');
      process.exit(0);
    });
    rl.on('pause', function() {
      g_bPauseRL = true;
    });
    rl.on('resume', function() {
      rl.prompt();
      g_bPauseRL = false;
    });
}


function main1()
{
  console.log( "start Handle ...!", cfg );
  parseIpData( cfg.dataSrc,function(){
      setTimeout( function(){
          get_locs();
      },1000);
  });
}


main1();




  