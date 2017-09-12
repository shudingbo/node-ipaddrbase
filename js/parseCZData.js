'use strict';

const readline = require('readline');
const fs = require('fs');
var GBK = require("./gbk.js");
const ipC = require('ip');

const REDIRECT_MODE_1 = 1;
const REDIRECT_MODE_2 = 2;

var cz = exports;
cz.parse = function( filename )
{
    return new Promise( (res,rej)=>{
        res(parseData( filename ));
    }); 
};


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
        str = GBK.dc_GBK( bufRet );
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




function parseData( filePath )
{
    let recsT= [];
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
    //nRec = 10000;
    ///////
     let bufIdx = new Buffer(7);
     for( let i=0;i<nRec;i++ ){
        fs.readSync( fd, bufIdx, 0,7, sOff + 7*i);
        let ipStart = bufIdx.readUInt32LE(0);
        let ipEndOff =  bufIdx.readUIntLE(4,3);
        /// read endIP
        fs.readSync( fd, bufIdx, 0,4, ipEndOff);
        let ipEnd = bufIdx.readUInt32LE(0);
        
        /// 获取地址模式
        fs.readSync( fd, bufIdx, 0,1, ipEndOff+4);
        let mode =  bufIdx.readUIntLE(0,1);
        let Country = "";
        let Area    = "";
        let ipwz = ipEndOff + 4;
        //console.log( i,ipC.fromLong(ipStart), ipStart );

        if( mode == REDIRECT_MODE_1 ){ //Country根据标识再判断
            ipwz = readUIntLE(fd,ipwz + 1,3); //读取国家偏移
            let lx = readUIntLE(fd,ipwz,1); //再次获取标识字节
            if (lx == REDIRECT_MODE_2){//再次检查标识字节
              Country = setIpFileString(fd,readUIntLE(fd,ipwz+1,3))[0];
              ipwz = ipwz + 4;
            }else{
              let loc = setIpFileString(fd,ipwz);
              Country = loc[0];
              ipwz += loc[1];
            }
            Area = ReadArea(fd,ipwz);
        }else if( mode == REDIRECT_MODE_2 ) //Country直接读取偏移处字符串
        {
            Country = setIpFileString(fd,readUIntLE(fd,ipwz+1,3))[0];
            Area = ReadArea(fd,ipwz + 4);
        }else{//Country直接读取 Area根据标志再判断
          let loc = setIpFileString(fd,ipwz);
          ipwz += loc[1];
          Country = loc[0];
          Area = ReadArea(fd,ipwz);
        }
        
        recsT.push( [ipStart, ipEnd,Country, Area]);
        //writeCZRec( `${ipStart} ${ipEnd} ${ipC.fromLong(ipStart)} ${ipC.fromLong(ipEnd)} ${Country} ${Area}\n` );
        //console.log( ipStart, ipEnd,ipC.fromLong(ipStart),ipC.fromLong(ipEnd), Country, Area );
     }
     fs.closeSync( fd);

     return recsT;
};